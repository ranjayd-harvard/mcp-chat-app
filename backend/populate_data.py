"""
Sample data script to populate MongoDB with test products
Run this after starting MongoDB to add sample data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "business_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "products")


async def populate_sample_data():
    """Populate MongoDB with sample products"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]
    
    # Clear existing data
    await collection.delete_many({})
    print("🗑️  Cleared existing products")
    
    # Sample products
    sample_products = [
        {
            "name": "Laptop Pro 15",
            "description": "High-performance laptop with 16GB RAM and 512GB SSD",
            "price": 1299.99,
            "quantity": 45,
            "category": "Electronics",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Wireless Mouse",
            "description": "Ergonomic wireless mouse with 6 buttons",
            "price": 29.99,
            "quantity": 150,
            "category": "Electronics",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Mechanical Keyboard",
            "description": "RGB mechanical keyboard with cherry MX switches",
            "price": 89.99,
            "quantity": 75,
            "category": "Electronics",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Office Chair",
            "description": "Ergonomic office chair with lumbar support",
            "price": 249.99,
            "quantity": 30,
            "category": "Furniture",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Standing Desk",
            "description": "Adjustable height standing desk",
            "price": 399.99,
            "quantity": 20,
            "category": "Furniture",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "USB-C Hub",
            "description": "7-in-1 USB-C hub with HDMI, SD card reader, and USB ports",
            "price": 49.99,
            "quantity": 100,
            "category": "Electronics",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Monitor 27\"",
            "description": "4K UHD monitor with HDR support",
            "price": 349.99,
            "quantity": 60,
            "category": "Electronics",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Desk Lamp",
            "description": "LED desk lamp with adjustable brightness",
            "price": 34.99,
            "quantity": 80,
            "category": "Furniture",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert sample products
    result = await collection.insert_many(sample_products)
    
    print(f"✅ Inserted {len(result.inserted_ids)} sample products:")
    
    # Display inserted products
    async for product in collection.find():
        print(f"  - {product['name']} (${product['price']}) - {product['quantity']} in stock")
    
    # Close connection
    client.close()
    print("\n🎉 Sample data populated successfully!")


if __name__ == "__main__":
    asyncio.run(populate_sample_data())
