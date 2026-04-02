"""
MCP Gateway — aggregates all backend HTTP APIs into a single MCP server
exposed via HTTP/SSE transport.

Clients (Claude Desktop, Claude.ai, etc.) connect to:
  SSE endpoint:  GET  http://<host>:8005/sse
  Post endpoint: POST http://<host>:8005/messages/

Tool routing by prefix:
  (no prefix) → Product API       http://backend:8000
  ext_        → External API      http://external-api:8002
  kafka_      → Kafka MCP         http://kafka-mcp:8003
  sql_        → SQL Server bridge http://sqlserver-bridge:8004
"""

import json
import os
import re
from contextlib import asynccontextmanager

import httpx
import uvicorn
from mcp import types
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

# ---------------------------------------------------------------------------
# Backend registry
# ---------------------------------------------------------------------------

BACKENDS = [
    {
        "name": "Product API",
        "url": os.getenv("PRODUCT_API_URL", "http://backend:8000"),
        "prefix": "",
    },
    {
        "name": "External API",
        "url": os.getenv("EXTERNAL_API_URL", "http://external-api:8002"),
        "prefix": "ext_",
    },
    {
        "name": "Kafka MCP",
        "url": os.getenv("KAFKA_MCP_URL", "http://kafka-mcp:8003"),
        "prefix": "kafka_",
    },
    {
        "name": "SQL Server",
        "url": os.getenv("SQL_MCP_URL", "http://sqlserver-bridge:8004"),
        "prefix": "sql_",
    },
]

SKIP_OPERATIONS = {"health", "root"}

# tool_name → routing info
tool_registry: dict[str, dict] = {}
# ordered list for list_tools()
mcp_tools: list[types.Tool] = []


# ---------------------------------------------------------------------------
# Schema helpers
# ---------------------------------------------------------------------------

def _resolve_ref(schema: dict, full_schema: dict) -> dict:
    """Dereference a JSON Schema $ref against the full OpenAPI document."""
    if "$ref" not in schema:
        return schema
    parts = schema["$ref"].lstrip("#/").split("/")
    node = full_schema
    for part in parts:
        node = node.get(part, {})
    return node


def _openapi_to_input_schema(operation: dict, path: str, full_schema: dict) -> dict:
    """Convert an OpenAPI operation to an MCP tool inputSchema."""
    properties: dict = {}
    required: list = []

    # Path parameters
    for param_name in re.findall(r"\{([^}]+)\}", path):
        properties[param_name] = {
            "type": "string",
            "description": f"Path parameter: {param_name}",
        }
        required.append(param_name)

    # Query / header parameters
    for param in operation.get("parameters", []):
        if param.get("in") == "query":
            properties[param["name"]] = {
                "type": param.get("schema", {}).get("type", "string"),
                "description": param.get("description", param["name"]),
            }
            if param.get("required"):
                required.append(param["name"])

    # Request body
    raw = (
        operation.get("requestBody", {})
        .get("content", {})
        .get("application/json", {})
        .get("schema", {})
    )
    if raw:
        body = _resolve_ref(raw, full_schema)
        properties.update(body.get("properties", {}))
        required.extend(body.get("required", []))

    schema: dict = {"type": "object", "properties": properties}
    if required:
        schema["required"] = required
    return schema


# ---------------------------------------------------------------------------
# Tool discovery
# ---------------------------------------------------------------------------

async def _discover_from_backend(backend: dict, client: httpx.AsyncClient) -> int:
    url = backend["url"]
    prefix = backend["prefix"]
    name = backend["name"]

    try:
        resp = await client.get(f"{url}/openapi.json", timeout=10)
        resp.raise_for_status()
        full_schema = resp.json()
    except Exception as exc:
        print(f"  ⚠️  {name} ({url}): {exc}")
        return 0

    count = 0
    for path, methods in full_schema.get("paths", {}).items():
        for method, details in methods.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            op_id = details.get("operationId") or f"{method}_{path.replace('/', '_')}"
            if op_id in SKIP_OPERATIONS:
                continue

            tool_name = f"{prefix}{op_id}" if prefix else op_id
            input_schema = _openapi_to_input_schema(details, path, full_schema)
            description = (
                details.get("summary") or details.get("description") or f"{method.upper()} {path}"
            )

            tool_registry[tool_name] = {
                "backend_url": url,
                "method": method,
                "path": path,
                "operation_id": op_id,
            }
            mcp_tools.append(
                types.Tool(name=tool_name, description=description, inputSchema=input_schema)
            )
            count += 1

    print(f"  ✅ {name}: {count} tools")
    return count


async def discover_all_tools() -> None:
    print("🔍 Discovering tools from backends...")
    async with httpx.AsyncClient() as client:
        for backend in BACKENDS:
            await _discover_from_backend(backend, client)
    print(f"🛠️  Gateway ready — {len(mcp_tools)} tools total")


# ---------------------------------------------------------------------------
# Backend HTTP dispatch
# ---------------------------------------------------------------------------

async def _dispatch(tool_name: str, arguments: dict) -> str:
    info = tool_registry[tool_name]
    method = info["method"]
    path = info["path"]
    backend_url = info["backend_url"]

    # Substitute path parameters, collect remaining as body/query
    remaining = dict(arguments)
    for param_name in re.findall(r"\{([^}]+)\}", path):
        if param_name in remaining:
            path = path.replace(f"{{{param_name}}}", str(remaining.pop(param_name)))

    async with httpx.AsyncClient(timeout=30) as client:
        if method == "get":
            resp = await client.get(f"{backend_url}{path}", params=remaining)
        else:
            resp = await client.request(
                method.upper(), f"{backend_url}{path}", json=remaining
            )

    if resp.status_code == 204:
        return json.dumps({"success": True})
    resp.raise_for_status()
    return resp.text


# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------

server = Server("product-assistant-mcp")


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return mcp_tools


@server.call_tool()
async def call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    if name not in tool_registry:
        raise ValueError(f"Unknown tool: {name}")
    try:
        result = await _dispatch(name, arguments or {})
        return [types.TextContent(type="text", text=result)]
    except Exception as exc:
        return [types.TextContent(type="text", text=json.dumps({"error": str(exc)}))]


# ---------------------------------------------------------------------------
# SSE transport + Starlette app
# ---------------------------------------------------------------------------

sse = SseServerTransport("/messages/")


async def handle_sse(request: Request) -> None:
    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as streams:
        await server.run(
            streams[0], streams[1], server.create_initialization_options()
        )


async def handle_messages(request: Request) -> None:
    await sse.handle_post_message(request.scope, request.receive, request._send)


async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "tools": len(mcp_tools)})


@asynccontextmanager
async def lifespan(_app: Starlette):
    await discover_all_tools()
    yield


app = Starlette(
    lifespan=lifespan,
    routes=[
        Route("/health", endpoint=health),
        Route("/sse", endpoint=handle_sse),
        Mount("/messages/", app=sse.handle_post_message),
    ],
)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("MCP_GATEWAY_PORT", "8005"))
    print(f"🚀 MCP Gateway starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
