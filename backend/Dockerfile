
# Base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies into SYSTEM python
# --system: install into system python
# . : install the project itself (and dependencies)
RUN uv pip install --system --no-cache .

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application using SYSTEM python uvicorn
# We run migrations first, then start the server
CMD ["/bin/bash", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]
