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
    [External API - OpenWeatherMap] Fetch live current weather for a city from the OpenWeatherMap API.
    Use this for real-time temperature, humidity, and conditions — not for product or Kafka data.

    Args:
        city: City name (e.g., "London", "New York")
        units: Temperature units (metric, imperial, or standard)
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
    [External API - OpenWeatherMap] Fetch a 5-day weather forecast for a city from the OpenWeatherMap API.
    Use this for future weather predictions — not for product or Kafka data.

    Args:
        request: Weather request with city and units
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
    [External API - ExchangeRate-API] Fetch live currency exchange rates from an external forex service.
    Use this for currency conversion data — not for product prices or Kafka events.

    Args:
        base_currency: Base currency code (e.g., USD, EUR, GBP)
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
    [External API - ExchangeRate-API] Convert a monetary amount between two currencies using live forex rates.
    Use this for currency math — not for product pricing or Kafka data.
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
    [External API - Alpha Vantage] Fetch a real-time stock quote from the Alpha Vantage market data API.
    Use this for live equity prices — not for product data or Kafka events.

    Args:
        symbol: Stock ticker symbol (e.g., AAPL, GOOGL, MSFT)
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
    [External API - HTTP Proxy] Make an arbitrary HTTP request to any external URL.
    ONLY use this as a last resort for external URLs not covered by other ext_ tools.
    Do NOT use this to call the Product API, Kafka MCP, or any other internal service — those have their own dedicated tools.

    Args:
        request: API request details (URL, method, headers, params, body)
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