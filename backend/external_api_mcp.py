"""
External API MCP Server
Integrates with external APIs for additional functionality
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="External API MCP Server",
    description="Integration with external APIs via MCP protocol",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Configuration
# ============================================

# Add your API keys here (store in .env)
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY", "")
STOCK_API_KEY = os.getenv("STOCK_API_KEY", "")

# API Base URLs
WEATHER_API_BASE = "https://api.openweathermap.org/data/2.5"
EXCHANGE_RATE_BASE = "https://api.exchangerate-api.com/v4/latest"
STOCK_API_BASE = "https://www.alphavantage.co/query"

# ============================================
# Pydantic Models
# ============================================

class WeatherRequest(BaseModel):
    city: str = Field(..., description="City name")
    units: str = Field(default="metric", description="Units: metric, imperial, or standard")

class ExchangeRateRequest(BaseModel):
    base_currency: str = Field(default="USD", description="Base currency code (e.g., USD, EUR)")
    target_currency: Optional[str] = Field(None, description="Target currency code (optional)")

class CurrencyConversionRequest(BaseModel):
    amount: float = Field(..., description="Amount to convert")
    from_currency: str = Field(..., description="Source currency code (e.g., USD)")
    to_currency: str = Field(..., description="Target currency code (e.g., GBP)")    

class StockQuoteRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol (e.g., AAPL, GOOGL)")

class GenericAPIRequest(BaseModel):
    url: str = Field(..., description="API endpoint URL")
    method: str = Field(default="GET", description="HTTP method (GET, POST, etc.)")
    headers: Optional[Dict[str, str]] = Field(None, description="Request headers")
    params: Optional[Dict[str, Any]] = Field(None, description="Query parameters")
    body: Optional[Dict[str, Any]] = Field(None, description="Request body (for POST/PUT)")

# ============================================
# Weather API Endpoints
# ============================================

@app.get("/weather/{city}", operation_id="get_weather")
async def get_weather(city: str, units: str = "metric"):
    """
    Get current weather for a city
    
    Args:
        city: City name (e.g., "London", "New York")
        units: Temperature units (metric, imperial, or standard)
    
    Returns:
        Weather data including temperature, conditions, humidity, etc.
    """
    if not WEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="Weather API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEATHER_API_BASE}/weather",
                params={
                    "q": city,
                    "appid": WEATHER_API_KEY,
                    "units": units
                }
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Weather API error: {str(e)}")


@app.post("/weather/forecast", operation_id="get_weather_forecast")
async def get_weather_forecast(request: WeatherRequest):
    """
    Get 5-day weather forecast for a city
    
    Args:
        request: Weather request with city and units
    
    Returns:
        5-day forecast data
    """
    if not WEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="Weather API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEATHER_API_BASE}/forecast",
                params={
                    "q": request.city,
                    "appid": WEATHER_API_KEY,
                    "units": request.units
                }
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Weather API error: {str(e)}")


# ============================================
# Currency Exchange Endpoints
# ============================================

@app.get("/exchange-rates/{base_currency}", operation_id="get_exchange_rates")
async def get_exchange_rates(base_currency: str = "USD"):
    """
    Get current exchange rates for a base currency
    
    Args:
        base_currency: Base currency code (e.g., USD, EUR, GBP)
    
    Returns:
        Exchange rates for all currencies
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{EXCHANGE_RATE_BASE}/{base_currency}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Exchange rate API error: {str(e)}")


@app.post("/convert-currency", operation_id="convert_currency")
async def convert_currency(request: CurrencyConversionRequest):
    """
    Convert amount from one currency to another
    
    Returns:
        Converted amount with exchange rate
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{EXCHANGE_RATE_BASE}/{request.from_currency}")
            response.raise_for_status()
            data = response.json()
            
            if request.to_currency not in data["rates"]:
                raise HTTPException(status_code=400, detail=f"Currency {request.to_currency} not found")
            
            rate = data["rates"][request.to_currency]
            converted = request.amount * rate
            
            return {
                "amount": request.amount,
                "from_currency": request.from_currency,
                "to_currency": request.to_currency,
                "exchange_rate": rate,
                "converted_amount": converted,
                "timestamp": datetime.utcnow().isoformat()
            }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Currency conversion error: {str(e)}")


# ============================================
# Stock Market Endpoints
# ============================================

@app.get("/stock/{symbol}", operation_id="get_stock_quote")
async def get_stock_quote(symbol: str):
    """
    Get real-time stock quote
    
    Args:
        symbol: Stock symbol (e.g., AAPL, GOOGL, MSFT)
    
    Returns:
        Stock price, volume, and other trading data
    """
    if not STOCK_API_KEY:
        raise HTTPException(status_code=500, detail="Stock API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                STOCK_API_BASE,
                params={
                    "function": "GLOBAL_QUOTE",
                    "symbol": symbol,
                    "apikey": STOCK_API_KEY
                }
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Stock API error: {str(e)}")


@app.post("/stock/historical", operation_id="get_stock_historical")
async def get_stock_historical(symbol: str, days: int = 30):
    """
    Get historical stock data
    
    Args:
        symbol: Stock symbol
        days: Number of days of historical data (default: 30)
    
    Returns:
        Historical price data
    """
    if not STOCK_API_KEY:
        raise HTTPException(status_code=500, detail="Stock API key not configured")
    
    # TODO: Implement historical data fetching
    # This is a placeholder for you to implement
    
    return {
        "symbol": symbol,
        "days": days,
        "message": "Historical data endpoint - implement with your preferred API"
    }


# ============================================
# Generic API Proxy (Flexible)
# ============================================

@app.post("/api-call", operation_id="generic_api_call")
async def generic_api_call(request: GenericAPIRequest):
    """
    Make a generic API call to any external endpoint
    
    Args:
        request: API request details (URL, method, headers, params, body)
    
    Returns:
        API response data
    """
    try:
        async with httpx.AsyncClient() as client:
            if request.method.upper() == "GET":
                response = await client.get(
                    request.url,
                    headers=request.headers,
                    params=request.params
                )
            elif request.method.upper() == "POST":
                response = await client.post(
                    request.url,
                    headers=request.headers,
                    params=request.params,
                    json=request.body
                )
            elif request.method.upper() == "PUT":
                response = await client.put(
                    request.url,
                    headers=request.headers,
                    params=request.params,
                    json=request.body
                )
            elif request.method.upper() == "DELETE":
                response = await client.delete(
                    request.url,
                    headers=request.headers,
                    params=request.params
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported HTTP method: {request.method}")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"API call error: {str(e)}")


# ============================================
# Health & Info Endpoints
# ============================================

@app.get("/")
async def root():
    return {
        "service": "External API MCP Server",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "weather": "/weather/{city}",
            "forecast": "/weather/forecast",
            "exchange_rates": "/exchange-rates/{base_currency}",
            "convert_currency": "/convert-currency",
            "stock_quote": "/stock/{symbol}",
            "generic_api": "/api-call"
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "apis_configured": {
            "weather": bool(WEATHER_API_KEY),
            "stock": bool(STOCK_API_KEY),
            "exchange_rate": True  # Free API, no key needed
        }
    }


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    PORT = int(os.getenv("EXTERNAL_API_PORT", 8001))
    
    print("\n" + "="*70)
    print("🌐 External API MCP Server")
    print("="*70)
    print(f"📍 Server:    http://localhost:{PORT}")
    print(f"📚 Docs:      http://localhost:{PORT}/docs")
    print(f"❤️  Health:    http://localhost:{PORT}/health")
    print("="*70)
    print("\n🔑 API Keys Status:")
    print(f"  Weather API:       {'✅ Configured' if WEATHER_API_KEY else '❌ Not set'}")
    print(f"  Stock API:         {'✅ Configured' if STOCK_API_KEY else '❌ Not set'}")
    print(f"  Exchange Rate API: ✅ No key required")
    print("="*70 + "\n")
    
    uvicorn.run(
        "external_api_mcp:app",
        host="0.0.0.0",
        port=PORT,
        reload=True
    )