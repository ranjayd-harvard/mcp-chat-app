"""
Custom MCP Tools - Standalone Server

This file contains ONLY custom MCP tools (no FastAPI).
Run this alongside your FastAPI server to provide additional tools.

Usage:
    python custom_tools_standalone.py
    
Claude Desktop Config:
    {
      "mcpServers": {
        "custom-analytics": {
          "command": "python",
          "args": ["/full/path/to/custom_tools_standalone.py"]
        }
      }
    }
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from mcp.server.fastmcp import FastMCP
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "product_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "products")

client = None
collection = None

# Initialize FastMCP
mcp = FastMCP("ProductAnalytics")


async def get_collection():
    """Get MongoDB collection"""
    global client, collection
    
    if not client:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
    
    return collection


@mcp.tool()
async def calculate_inventory_value(category: str = None) -> dict:
    """
    Calculate total inventory value, optionally filtered by category.
    
    This tool computes the total value of all products in stock by
    multiplying price × quantity for each product.
    
    Args:
        category: Optional product category to filter by (e.g., 'Electronics', 'Furniture')
                  If not provided, calculates value across all categories.
    
    Returns:
        Dictionary containing:
        - category: The category analyzed (or 'all')
        - total_inventory_value: Total value in USD
        - product_count: Number of products analyzed
        - average_price: Average price per product
        - currency: Currency code (USD)
    
    Example:
        >>> calculate_inventory_value(category="Electronics")
        {
            "category": "Electronics",
            "total_inventory_value": 45000.00,
            "product_count": 4,
            "average_price": 467.49,
            "currency": "USD"
        }
    """
    coll = await get_collection()
    
    # Build query
    query = {"category": category} if category else {}
    
    # Calculate metrics
    total_value = 0
    product_count = 0
    prices = []
    
    async for product in coll.find(query):
        value = product["price"] * product["quantity"]
        total_value += value
        product_count += 1
        prices.append(product["price"])
    
    avg_price = sum(prices) / len(prices) if prices else 0
    
    return {
        "category": category or "all",
        "total_inventory_value": round(total_value, 2),
        "product_count": product_count,
        "average_price": round(avg_price, 2),
        "currency": "USD"
    }


@mcp.tool()
async def find_low_stock_products(threshold: int = 10) -> dict:
    """
    Identify products with stock levels at or below a specified threshold.
    
    This tool helps with inventory management by flagging products that
    may need restocking soon. Useful for preventing stockouts.
    
    Args:
        threshold: Minimum acceptable stock level. Products with quantity
                   at or below this value will be flagged. Default is 10 units.
    
    Returns:
        Dictionary containing:
        - threshold: The threshold value used
        - low_stock_count: Number of products below threshold
        - products: List of low-stock products with details
        
    Example:
        >>> find_low_stock_products(threshold=20)
        {
            "threshold": 20,
            "low_stock_count": 2,
            "products": [
                {
                    "id": "...",
                    "name": "Standing Desk",
                    "current_stock": 20,
                    "category": "Furniture",
                    "price": 399.99
                }
            ]
        }
    """
    coll = await get_collection()
    
    low_stock_products = []
    
    async for product in coll.find({"quantity": {"$lte": threshold}}):
        low_stock_products.append({
            "id": str(product["_id"]),
            "name": product["name"],
            "current_stock": product["quantity"],
            "category": product.get("category"),
            "price": product["price"]
        })
    
    return {
        "threshold": threshold,
        "low_stock_count": len(low_stock_products),
        "products": low_stock_products
    }


@mcp.tool()
async def get_price_statistics(category: str = None) -> dict:
    """
    Calculate comprehensive price statistics for products.
    
    Provides statistical analysis of product pricing including min, max,
    mean, median, and price range. Useful for pricing strategy and
    competitive analysis.
    
    Args:
        category: Optional category to analyze (e.g., 'Electronics')
                  If not provided, analyzes all products.
    
    Returns:
        Dictionary containing:
        - category: Category analyzed
        - count: Number of products
        - min_price: Lowest price
        - max_price: Highest price
        - mean_price: Average price
        - median_price: Middle value
        - price_range: Difference between max and min
    
    Example:
        >>> get_price_statistics(category="Electronics")
        {
            "category": "Electronics",
            "count": 4,
            "min_price": 29.99,
            "max_price": 1299.99,
            "mean_price": 442.49,
            "median_price": 219.99,
            "price_range": 1270.00
        }
    """
    coll = await get_collection()
    
    query = {"category": category} if category else {}
    
    prices = []
    async for product in coll.find(query):
        prices.append(product["price"])
    
    if not prices:
        return {"error": f"No products found for category: {category or 'all'}"}
    
    prices.sort()
    n = len(prices)
    median = prices[n // 2] if n % 2 == 1 else (prices[n // 2 - 1] + prices[n // 2]) / 2
    
    return {
        "category": category or "all",
        "count": n,
        "min_price": min(prices),
        "max_price": max(prices),
        "mean_price": round(sum(prices) / n, 2),
        "median_price": round(median, 2),
        "price_range": round(max(prices) - min(prices), 2)
    }


@mcp.tool()
async def generate_restock_report(threshold: int = 30, days_of_stock: int = 60) -> dict:
    """
    Generate a comprehensive restock report with recommendations.
    
    Analyzes inventory levels and generates prioritized restock
    recommendations based on current stock and target days of inventory.
    
    Args:
        threshold: Products with stock below this level are flagged as urgent
        days_of_stock: Target number of days of inventory to maintain
    
    Returns:
        Detailed restock report with recommendations and cost estimates
    
    Example:
        >>> generate_restock_report(threshold=30, days_of_stock=60)
        {
            "summary": {
                "products_analyzed": 8,
                "products_needing_restock": 3,
                "total_estimated_cost": 15000.00
            },
            "urgent": [...],
            "recommended": [...]
        }
    """
    coll = await get_collection()
    
    urgent = []
    recommended = []
    total_products = 0
    
    # Simplified logic: assume 1 unit sold per day
    daily_sales_rate = 1
    
    async for product in coll.find():
        total_products += 1
        current_stock = product["quantity"]
        target_stock = days_of_stock * daily_sales_rate
        
        if current_stock < target_stock:
            restock_qty = target_stock - current_stock
            recommendation = {
                "product_id": str(product["_id"]),
                "product_name": product["name"],
                "category": product.get("category"),
                "current_stock": current_stock,
                "target_stock": target_stock,
                "restock_quantity": restock_qty,
                "estimated_cost": round(restock_qty * product["price"], 2),
                "unit_price": product["price"]
            }
            
            if current_stock < threshold:
                recommendation["priority"] = "URGENT"
                urgent.append(recommendation)
            else:
                recommendation["priority"] = "RECOMMENDED"
                recommended.append(recommendation)
    
    total_cost = sum(r["estimated_cost"] for r in urgent + recommended)
    
    return {
        "summary": {
            "products_analyzed": total_products,
            "products_needing_restock": len(urgent) + len(recommended),
            "urgent_restock_count": len(urgent),
            "recommended_restock_count": len(recommended),
            "total_estimated_cost": round(total_cost, 2),
            "parameters": {
                "urgency_threshold": threshold,
                "days_of_stock_target": days_of_stock
            }
        },
        "urgent_restock": urgent,
        "recommended_restock": recommended
    }


@mcp.tool()
async def compare_categories() -> dict:
    """
    Compare performance across all product categories.
    
    Provides a comprehensive comparison of all categories including
    product count, total value, average price, and stock levels.
    
    Returns:
        Dictionary with category comparisons and insights
    
    Example:
        >>> compare_categories()
        {
            "total_categories": 2,
            "comparisons": [
                {
                    "category": "Electronics",
                    "product_count": 6,
                    "total_value": 45000.00,
                    ...
                }
            ],
            "insights": {...}
        }
    """
    coll = await get_collection()
    
    # Group by category
    categories = {}
    
    async for product in coll.find():
        cat = product.get("category", "Uncategorized")
        
        if cat not in categories:
            categories[cat] = {
                "products": [],
                "total_value": 0,
                "total_quantity": 0
            }
        
        value = product["price"] * product["quantity"]
        categories[cat]["products"].append(product)
        categories[cat]["total_value"] += value
        categories[cat]["total_quantity"] += product["quantity"]
    
    # Calculate stats for each category
    comparisons = []
    for cat, data in categories.items():
        prices = [p["price"] for p in data["products"]]
        comparisons.append({
            "category": cat,
            "product_count": len(data["products"]),
            "total_inventory_value": round(data["total_value"], 2),
            "total_units_in_stock": data["total_quantity"],
            "average_price": round(sum(prices) / len(prices), 2),
            "min_price": min(prices),
            "max_price": max(prices)
        })
    
    # Sort by total value
    comparisons.sort(key=lambda x: x["total_inventory_value"], reverse=True)
    
    # Generate insights
    if comparisons:
        top_category = comparisons[0]
        insights = {
            "highest_value_category": top_category["category"],
            "highest_value_amount": top_category["total_inventory_value"],
            "total_categories": len(comparisons)
        }
    else:
        insights = {"message": "No products found"}
    
    return {
        "total_categories": len(comparisons),
        "comparisons": comparisons,
        "insights": insights
    }


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🔧 Custom MCP Tools Server")
    print("="*70)
    print("\nAvailable Tools:")
    print("  • calculate_inventory_value")
    print("  • find_low_stock_products")
    print("  • get_price_statistics")
    print("  • generate_restock_report")
    print("  • compare_categories")
    print("\n" + "="*70)
    print("Usage: Configure in claude_desktop_config.json")
    print("="*70 + "\n")
    
    mcp.run()
