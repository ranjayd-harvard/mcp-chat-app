"""
Simple FastAPI + MCP Server (Works with Claude Desktop via mcp-proxy)
This is the EASIEST approach - just run this server and use mcp-proxy
"""
from fastapi import FastAPI, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
from bson import ObjectId
from datetime import datetime
import os

from database import connect_to_mongo, close_mongo_connection, get_collection
from models import Product, ProductResponse, ProductUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Product API",
    description="Simple product management API - Use with mcp-proxy for MCP",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def product_helper(product) -> dict:
    return {
        "id": str(product["_id"]),
        "name": product["name"],
        "description": product.get("description"),
        "price": product["price"],
        "quantity": product["quantity"],
        "category": product.get("category"),
        "created_at": product.get("created_at"),
        "updated_at": product.get("updated_at")
    }


@app.get("/products", response_model=List[ProductResponse], operation_id="list_products")
async def list_products(category: str = None, limit: int = 100):
    """Get all products, optionally filtered by category"""
    collection = get_collection()
    query = {"category": category} if category else {}
    
    products = []
    async for product in collection.find(query).limit(limit):
        products.append(product_helper(product))
    
    return products


@app.get("/products/{product_id}", response_model=ProductResponse, operation_id="get_product_by_id")
async def get_product_by_id(product_id: str):
    """Get a specific product by ID"""
    collection = get_collection()
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = await collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product_helper(product)


@app.post("/products", response_model=ProductResponse, status_code=201, operation_id="add_product")
async def add_product(product: Product):
    """Create a new product"""
    collection = get_collection()
    
    product_data = product.model_dump()
    product_data["created_at"] = datetime.utcnow()
    product_data["updated_at"] = datetime.utcnow()
    
    result = await collection.insert_one(product_data)
    new_product = await collection.find_one({"_id": result.inserted_id})
    
    return product_helper(new_product)


@app.patch("/products/{product_id}", response_model=ProductResponse, operation_id="modify_product")
async def modify_product(product_id: str, updates: ProductUpdate):
    """Update a product"""
    collection = get_collection()
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    existing = await collection.find_one({"_id": ObjectId(product_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    await collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    updated = await collection.find_one({"_id": ObjectId(product_id)})
    return product_helper(updated)


@app.delete("/products/{product_id}", status_code=204, operation_id="remove_product")
async def remove_product(product_id: str):
    """Delete a product"""
    collection = get_collection()
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    result = await collection.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return Response(status_code=204)


@app.get("/")
async def root():
    return {
        "message": "Product Management API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "database": "connected" if get_collection() else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    
    print("\n" + "="*70)
    print("🚀 Product Management API")
    print("="*70)
    print(f"📍 Server:    http://localhost:{PORT}")
    print(f"📚 Docs:      http://localhost:{PORT}/docs")
    print(f"❤️  Health:    http://localhost:{PORT}/health")
    print("="*70)
    print("\n🤖 MCP Integration with Claude Desktop:")
    print("="*70)
    print("1. Install mcp-proxy:")
    print("   pip install mcp-proxy")
    print()
    print("2. Add to claude_desktop_config.json:")
    print("   {")
    print('     "mcpServers": {')
    print('       "products": {')
    print('         "command": "mcp-proxy",')
    print(f'         "args": ["http://localhost:{PORT}"]')
    print('       }')
    print('     }')
    print("   }")
    print()
    print("3. Restart Claude Desktop")
    print("="*70 + "\n")
    
    uvicorn.run(
        "main_simple_mcp:app",
        host=HOST,
        port=PORT,
        reload=True
    )
