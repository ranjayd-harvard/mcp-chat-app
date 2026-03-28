"""
Database connection and utilities for MongoDB
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "product_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "products")

# Global database client
client = None
database = None
collection = None


async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, database, collection
    
    client = AsyncIOMotorClient(MONGODB_URL)
    database = client[DATABASE_NAME]
    collection = database[COLLECTION_NAME]
    
    print(f"✅ Connected to MongoDB: {DATABASE_NAME}.{COLLECTION_NAME}")


async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    
    if client:
        client.close()
        print("❌ Closed MongoDB connection")


def get_collection():
    """Get the MongoDB collection"""
    return collection


def get_database():
    """Get the MongoDB database"""
    return database