
# Base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependencies
COPY pyproject.toml uv.lock ./

# Install dependencies into SYSTEM python
RUN uv pip install --system --no-cache .

# Copy worker code
COPY . .

# Command
CMD ["celery", "-A", "celery_app", "worker", "--loglevel=info"]
