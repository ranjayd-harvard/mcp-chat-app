# Python FastAPI backend
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the FastAPI server
CMD ["python", "main_simple_mcp.py"]
