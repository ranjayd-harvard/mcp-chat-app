import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = process.env.SQLSERVER_BRIDGE_PORT || 8004;

let mcpClient;
let tools = [];

async function initMCP() {
  const mcpBin = path.join(process.cwd(), 'node_modules', '.bin', 'mcp-sqlserver');

  const transport = new StdioClientTransport({
    command: mcpBin,
    args: [],
    env: {
      ...process.env,
      SQLSERVER_HOST:       process.env.SQLSERVER_HOST      || 'sqlserver',
      SQLSERVER_PORT:       process.env.SQLSERVER_PORT      || '1433',
      SQLSERVER_USER:       process.env.SQLSERVER_USER      || 'sa',
      SQLSERVER_PASSWORD:   process.env.SQLSERVER_PASSWORD  || '',
      SQLSERVER_TRUST_CERT: process.env.SQLSERVER_TRUST_CERT || 'true',
    },
  });

  mcpClient = new Client({ name: 'sqlserver-bridge', version: '1.0.0' }, { capabilities: {} });
  await mcpClient.connect(transport);

  const result = await mcpClient.listTools();
  tools = result.tools || [];
  console.log(`✅ Connected to mcp-sqlserver — ${tools.length} tools loaded`);
  tools.forEach(t => console.log(`  • ${t.name}`));
}

function generateOpenAPISchema() {
  const paths = {
    '/health': {
      get: {
        operationId: 'health',
        summary: 'Health check',
        responses: { '200': { description: 'OK' } },
      },
    },
  };

  for (const tool of tools) {
    paths[`/${tool.name}`] = {
      post: {
        operationId: tool.name,
        summary: tool.description || tool.name,
        requestBody: {
          content: {
            'application/json': {
              schema: tool.inputSchema || { type: 'object', properties: {} },
            },
          },
        },
        responses: { '200': { description: 'Success' } },
      },
    };
  }

  return {
    openapi: '3.0.0',
    info: { title: 'SQL Server MCP Bridge', version: '1.0.0' },
    paths,
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'GET' && url.pathname === '/openapi.json') {
    res.writeHead(200);
    res.end(JSON.stringify(generateOpenAPISchema()));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', tools: tools.length }));
    return;
  }

  if (req.method === 'POST') {
    const toolName = url.pathname.slice(1);
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: `Tool '${toolName}' not found` }));
      return;
    }

    let body = '';
    for await (const chunk of req) body += chunk;

    const args = body ? JSON.parse(body) : {};

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const result = await mcpClient.callTool({ name: toolName, arguments: args });

        // Extract text content from MCP response envelope
        const content = result.content || [];
        const text = content.filter(c => c.type === 'text').map(c => c.text).join('\n');

        res.writeHead(200);
        try {
          res.end(JSON.stringify(JSON.parse(text)));
        } catch {
          res.end(JSON.stringify({ result: text }));
        }
        break; // success — exit retry loop
      } catch (error) {
        const msg = String(error);
        const isConnErr = msg.includes('closed') || msg.includes('disconnected') || msg.includes('ECONNRESET') || msg.includes('Connection');
        if (attempt === 0 && isConnErr) {
          console.warn(`⚠️  Connection lost — reconnecting and retrying ${toolName}...`);
          try { await initMCP(); } catch { /* initMCP logs its own errors */ }
        } else {
          console.error(`❌ Tool ${toolName} failed:`, error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(error) }));
          break;
        }
      }
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

try {
  await initMCP();
} catch (error) {
  console.error('❌ Failed to connect to mcp-sqlserver:', error.message);
  console.error('   Bridge will start but tool calls will fail until SQL Server is reachable.');
  tools = [];
}

server.listen(PORT, () => {
  console.log(`🚀 SQL Server bridge listening on port ${PORT}`);
});
