"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Product(BaseModel):
    """Product model for creating/updating products"""
    name: str = Field(..., description="Product name", min_length=1)
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., description="Product price", gt=0)
    quantity: int = Field(default=0, description="Stock quantity", ge=0)
    category: Optional[str] = Field(None, description="Product category")


class ProductResponse(Product):
    """Product model with ID for responses"""
    id: str = Field(..., description="Product ID")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "name": "Laptop",
                "description": "High-performance laptop",
                "price": 999.99,
                "quantity": 50,
                "category": "Electronics",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }


class ProductUpdate(BaseModel):
    """Product model for partial updates (PATCH)"""
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None
