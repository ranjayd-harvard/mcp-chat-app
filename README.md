# MCP Chat App - AI-Powered Product Assistant

A full-stack application demonstrating the **Model Context Protocol (MCP)** with Claude AI, FastAPI, MongoDB, and Next.js. This app showcases how to build an intelligent chatbot that can interact with your business data through natural language.

![MCP Architecture](https://img.shields.io/badge/MCP-Enabled-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green) ![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## 🌟 Features

- 🤖 **Claude AI Integration** - Natural language understanding with tool calling
- 🔧 **MCP Protocol** - Dual-server approach (REST API + Custom Tools)
- 💬 **Smart Conversations** - Context-aware multi-turn dialogues
- 📊 **Business Intelligence** - Inventory analytics, price statistics, stock alerts
- 🎨 **Modern UI** - Beautiful glassmorphism design with Tailwind CSS
- 🐳 **Docker Ready** - Complete containerized deployment
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Browser                        │
│              (Next.js + React Frontend)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Claude API    │
            │  (Anthropic)   │
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  FastAPI Server  │   │  Custom MCP      │
│  Port 8000       │   │  Tools Server    │
│                  │   │                  │
│  • REST API      │   │  • Analytics     │
│  • CRUD Ops      │   │  • Calculations  │
│  • Products      │   │  • Reports       │
└────────┬─────────┘   └──────────────────┘
         │
         ▼
   ┌──────────┐
   │ MongoDB  │
   │ Port     │
   │ 27017    │
   └──────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- OR: **Node.js 18+**, **Python 3.11+**, **MongoDB**
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))

### Option 1: Docker (Recommended)

**1. Clone the repository:**
```bash
git clone <your-repo-url>
cd mcp-chat-app
```

**2. Set up environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

**3. Start everything with Docker:**
```bash
docker-compose up -d
```

**4. Populate sample data:**
```bash
docker exec mcp-backend python populate_data.py
```

**5. Open your browser:**
```
http://localhost:3000
```

That's it! 🎉

### Option 2: Manual Setup

<details>
<summary>Click to expand manual setup instructions</summary>

**1. Start MongoDB:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**2. Set up Python backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python populate_data.py
python main_simple_mcp.py
```

**3. Set up Next.js frontend (new terminal):**
```bash
cd ..  # Back to project root
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

**4. Open http://localhost:3000**

</details>

## 📚 Usage Examples

### Natural Language Queries

```
💬 "List all Furniture products"
→ Shows products from FastAPI database

💬 "Calculate inventory value for Electronics"  
→ Calls custom analytics tool

💬 "Which products need restocking?"
→ Finds low-stock items

💬 "Tell me about the desk lamp"
→ Searches and retrieves specific product

💬 "What's the average price of products?"
→ Calculates price statistics
```

### Available Tools

**REST API Tools (FastAPI):**
- `list_products` - Get all products with filtering
- `get_product_by_id` - Retrieve specific product
- `create_product` - Add new product
- `update_product` - Modify existing product
- `delete_product` - Remove product

**Custom Analytics Tools:**
- `calculate_inventory_value` - Total inventory worth
- `find_low_stock_products` - Stock alerts
- `get_price_statistics` - Pricing analytics
- `generate_restock_report` - Restock recommendations
- `compare_categories` - Category performance

## 🛠️ Development

### Project Structure

```
mcp-chat-app/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts      # Claude API integration
│   │   ├── page.tsx               # Main chat interface
│   │   └── globals.css            # Styles
│   ├── components/
│   │   ├── Message.tsx            # Chat message bubbles
│   │   ├── ChatInput.tsx          # Input field
│   │   └── ToolsPanel.tsx         # Tools sidebar
│   ├── lib/
│   │   └── mcp-client.ts          # MCP client
│   └── types/
│       └── index.ts               # TypeScript types
├── backend/
│   ├── main_simple_mcp.py         # FastAPI server
│   ├── custom_tools_standalone.py # Custom tools (optional)
│   ├── database.py                # MongoDB connection
│   ├── models.py                  # Pydantic models
│   └── populate_data.py           # Sample data script
├── docker-compose.yml             # Docker orchestration
├── Dockerfile                     # Frontend container
└── backend/Dockerfile             # Backend container
```

### Running Tests

```bash
# Frontend
npm run lint

# Backend
cd backend
pytest  # (if tests are added)
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Claude API key | Required |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `product_db` |

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Reset everything (including data)
docker-compose down -v
```

## 🎨 Customization

### Change Theme Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  primary: {
    500: '#your-color',
    600: '#your-color',
  }
}
```

### Add New Tools

**1. Add FastAPI endpoint:**
```python
# backend/main_simple_mcp.py
@app.get("/your-endpoint", operation_id="your_tool")
async def your_tool():
    return {"data": "..."}
```

**2. Tool automatically appears in Claude!**

### Modify UI

- **Welcome screen**: `src/app/page.tsx` (around line 250)
- **Message styling**: `src/components/Message.tsx`
- **Input field**: `src/components/ChatInput.tsx`

## 📖 Documentation

- [MCP Protocol Docs](https://modelcontextprotocol.io)
- [Anthropic API Docs](https://docs.anthropic.com)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Next.js Docs](https://nextjs.org/docs)

## 🔧 Troubleshooting

### "Cannot connect to API"
- Check if backend is running: `curl http://localhost:8000/health`
- Verify CORS is enabled (already configured)

### "Invalid API key"
- Ensure `.env.local` has correct `ANTHROPIC_API_KEY`
- Key should start with `sk-ant-`

### "MongoDB connection failed"
- Check if MongoDB is running: `docker ps | grep mongo`
- Verify port 27017 is not in use

### Docker issues
```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 🚢 Deployment

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard:
# ANTHROPIC_API_KEY=your-key
```

### Deploy Backend

- **Railway**: Connect GitHub repo, Railway auto-detects FastAPI
- **Render**: Similar auto-deployment
- **AWS/GCP**: Use Docker image

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes!

## 🙏 Acknowledgments

- **Anthropic** for Claude API and MCP protocol
- **FastAPI** for the amazing Python framework
- **Next.js** team for the React framework
- **Vercel** for hosting platform

## 📧 Contact

Questions? Open an issue or reach out!

---

**Built with ❤️ using MCP, Claude, FastAPI, and Next.js**
