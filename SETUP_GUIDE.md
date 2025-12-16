# Complete Setup Guide: Two-Server MCP Approach with Chat UI

This guide walks you through setting up the complete system with FastAPI, custom MCP tools, and a beautiful Next.js chat interface.

## 🎯 What You're Building

```
┌──────────────────────────────────────┐
│     Browser (localhost:3000)         │
│     Next.js Chat Interface           │
└────────────┬─────────────────────────┘
             │
       ┌─────┴──────┐
       │            │
       ▼            ▼
┌─────────────┐  ┌──────────────────┐
│  FastAPI    │  │  Custom Tools    │
│  (8000)     │  │  Server (8001)   │
│             │  │                  │
│ REST API    │  │ Analytics Tools  │
│ - CRUD ops  │  │ - Calculations   │
│ - Products  │  │ - Reports        │
│ - Orders    │  │ - Statistics     │
└──────┬──────┘  └────────┬─────────┘
       │                   │
       └────────┬──────────┘
                ▼
        ┌──────────────┐
        │   MongoDB    │
        │   (27017)    │
        └──────────────┘
```

## 📋 Prerequisites

### Required Software

- **Python 3.11+** (3.12 or 3.13 recommended)
- **Node.js 18+** (for Next.js)
- **MongoDB** (via Docker or local install)
- **Git** (to clone if needed)

### Check Your Versions

```bash
python --version    # Should be 3.11+
node --version      # Should be 18+
npm --version       # Should be 9+
docker --version    # For MongoDB
```

## 🚀 Step-by-Step Setup

### Part 1: MongoDB Setup

**Option A: Using Docker (Recommended)**

```bash
# Start MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify it's running
docker ps | grep mongo
```

**Option B: Local MongoDB**

Install from [mongodb.com](https://www.mongodb.com/try/download/community) and start the service.

**Test Connection:**

```bash
# Using mongosh
mongosh

# Or using Docker
docker exec -it mongodb mongosh
```

---

### Part 2: FastAPI Backend Setup

#### 2.1: Navigate to Backend Directory

```bash
cd fastapi-mcp-demo
```

#### 2.2: Create Virtual Environment

```bash
# Create venv
python -m venv .venv

# Activate (Mac/Linux)
source .venv/bin/activate

# Activate (Windows)
.venv\Scripts\activate
```

#### 2.3: Install Dependencies

```bash
pip install -r requirements.txt
```

#### 2.4: Add Sample Data

```bash
python populate_data.py
```

You should see:
```
🗑️  Cleared existing products
✅ Inserted 8 sample products:
  - Laptop Pro 15 ($1299.99) - 45 in stock
  ...
🎉 Sample data populated successfully!
```

#### 2.5: Start FastAPI Server

```bash
python main_simple_mcp.py
```

You should see:
```
🚀 Product Management API
📍 Server:    http://localhost:8000
📚 Docs:      http://localhost:8000/docs
```

**Test it:**
```bash
curl http://localhost:8000/products
```

✅ **FastAPI Server is now running!**

---

### Part 3: Custom Tools Server Setup

#### 3.1: Open New Terminal

Keep FastAPI running, open a **new terminal**.

#### 3.2: Navigate and Activate

```bash
cd fastapi-mcp-demo
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
```

#### 3.3: Start Custom Tools Server

```bash
python custom_tools_standalone.py
```

You should see:
```
🔧 Custom MCP Tools Server
Available Tools:
  • calculate_inventory_value
  • find_low_stock_products
  • get_price_statistics
  • generate_restock_report
  • compare_categories
```

✅ **Custom Tools Server is now running!**

---

### Part 4: Next.js Chat Interface Setup

#### 4.1: Open New Terminal

You now have 2 terminals running (FastAPI + Custom Tools). Open a **3rd terminal**.

#### 4.2: Navigate to Next.js App

```bash
cd mcp-chat-app
```

#### 4.3: Install Dependencies

```bash
npm install
```

This will take a few minutes the first time.

#### 4.4: Start Development Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.1.3
- Local:        http://localhost:3000
- ready started server on [::]:3000, url: http://localhost:3000
```

#### 4.5: Open in Browser

Open **http://localhost:3000** in your browser.

✅ **You should see the chat interface!**

---

## 🎉 Verification Checklist

### ✅ All Systems Running

You should have **3 terminals** running:

**Terminal 1:**
```bash
# In fastapi-mcp-demo/
python main_simple_mcp.py
# Running on http://localhost:8000
```

**Terminal 2:**
```bash
# In fastapi-mcp-demo/
python custom_tools_standalone.py
# MCP server running (stdio)
```

**Terminal 3:**
```bash
# In mcp-chat-app/
npm run dev
# Running on http://localhost:3000
```

### ✅ Test Each Component

**1. MongoDB:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","database":"connected"}
```

**2. FastAPI:**
```bash
curl http://localhost:8000/products
# Should return JSON array of products
```

**3. Next.js UI:**
- Open http://localhost:3000
- Should see beautiful chat interface
- Click "X Tools" button → Should see available tools

**4. End-to-End Test:**

In the chat interface, type:
```
"Calculate inventory value for Electronics"
```

You should see:
- Message appears
- Tool call visualization
- Response with actual data from MongoDB

---

## 🎨 Using the Chat Interface

### Example Conversations

**Inventory Analysis:**
```
User: "What's the total inventory value?"
AI: [Calls calculate_inventory_value]
    "The total value is $145,234.56 across 8 products..."
```

**Low Stock Alerts:**
```
User: "Which products need restocking?"
AI: [Calls find_low_stock_products]
    "I found 2 products with low stock: ..."
```

**Product Search:**
```
User: "Show me all Electronics products"
AI: [Calls list_products with category filter]
    "Here are the Electronics products: ..."
```

**Price Analytics:**
```
User: "Get price statistics"
AI: [Calls get_price_statistics]
    "Price statistics: Min: $29.99, Max: $1,299.99, ..."
```

### Exploring Tools

1. Click **"X Tools"** button in header
2. Browse **REST API Tools** (from FastAPI)
3. Browse **Custom Analytics Tools** (from custom server)
4. Click any tool to see parameters

---

## 🛠️ Customization

### Change Theme Colors

Edit `mcp-chat-app/tailwind.config.js`:

```javascript
colors: {
  primary: {
    500: '#0ea5e9',  // Change this
    600: '#0284c7',  // And this
  },
}
```

### Add New Tools

**In FastAPI** (`fastapi-mcp-demo/main_simple_mcp.py`):
```python
@app.get("/your-endpoint", operation_id="your_tool_name")
async def your_tool():
    return {"data": "..."}
```

**In Custom Tools** (`fastapi-mcp-demo/custom_tools_standalone.py`):
```python
@mcp.tool()
async def your_custom_tool(param: str) -> dict:
    """Your tool description"""
    return {"result": "..."}
```

**In Chat UI** (`mcp-chat-app/src/app/page.tsx`):

Add keyword matching in `processMessage()`:
```typescript
if (lowerContent.includes('your keyword')) {
  const result = await mcpClient.current.callAPITool('your_tool_name', {});
  // Handle result
}
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```
pymongo.errors.ServerSelectionTimeoutError
```

**Solution:**
```bash
# Check if MongoDB is running
docker ps | grep mongo

# If not, start it
docker start mongodb
```

### Port Already in Use

```
Address already in use: 8000
```

**Solution:**
```bash
# Find and kill process
lsof -i :8000        # Mac/Linux
kill -9 <PID>

# Or change port in .env
PORT=8001
```

### Next.js Module Not Found

```
Module not found: Can't resolve '@/components/...'
```

**Solution:**
```bash
cd mcp-chat-app
rm -rf node_modules package-lock.json
npm install
```

### Tools Not Appearing

**Check:**
1. FastAPI server is running: `curl http://localhost:8000/openapi.json`
2. Custom tools server is running (check terminal output)
3. Browser console for errors (F12)

---

## 📊 Architecture Diagram

```
Frontend (Next.js)
    ↓
    ├─→ MCPClient.getAPITools()
    │   └─→ GET /openapi.json (FastAPI)
    │       └─→ Converts endpoints to tools
    │
    ├─→ MCPClient.getCustomTools()
    │   └─→ Predefined tool list
    │
    ├─→ MCPClient.callAPITool()
    │   └─→ HTTP request to FastAPI
    │       └─→ MongoDB query
    │
    └─→ MCPClient.callCustomTool()
        └─→ (Simulated in demo)
            └─→ In production: Call Python MCP server
```

---

## 🎯 Next Steps

### 1. Customize the UI
- Change colors and theme
- Add your logo
- Modify welcome message

### 2. Add More Tools
- Create new FastAPI endpoints
- Add custom analytics functions
- Integrate external APIs

### 3. Deploy to Production
- Deploy Next.js to Vercel
- Deploy FastAPI to Railway/Render
- Use managed MongoDB (Atlas)

### 4. Add Authentication
- Implement user login
- Secure API endpoints
- Add role-based access

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `main_simple_mcp.py` | FastAPI REST server |
| `custom_tools_standalone.py` | Custom MCP tools |
| `mcp-chat-app/src/app/page.tsx` | Main chat interface |
| `mcp-chat-app/src/lib/mcp-client.ts` | MCP client logic |
| `mcp-chat-app/src/components/*` | UI components |

---

## ✅ Success!

You now have:
- ✅ FastAPI server with REST endpoints
- ✅ Custom MCP tools server
- ✅ Beautiful chat interface
- ✅ End-to-end working system

**Start chatting with your Product Assistant!** 🎉
