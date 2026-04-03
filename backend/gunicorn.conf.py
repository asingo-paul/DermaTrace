"""Gunicorn config for production — handles thousands of concurrent users.

Run with:
    gunicorn app.main:app -c gunicorn.conf.py

Workers = (2 × CPU cores) + 1 is the standard formula.
For Railway/Render free tier (1 vCPU): 3 workers × 1000 connections = ~3000 concurrent.
For 2 vCPU: 5 workers × 1000 connections = ~5000 concurrent.
"""

import multiprocessing

# Worker class — uvicorn async workers handle async FastAPI perfectly
worker_class = "uvicorn.workers.UvicornWorker"

# Number of worker processes
workers = multiprocessing.cpu_count() * 2 + 1

# Max concurrent connections per worker
worker_connections = 1000

# Bind
bind = "0.0.0.0:8000"

# Timeouts
timeout = 30          # Kill worker if request takes > 30s
keepalive = 5         # Keep connections alive for 5s (reduces TCP overhead)
graceful_timeout = 30 # Give workers 30s to finish on shutdown

# Logging
accesslog = "-"       # stdout
errorlog = "-"        # stderr
loglevel = "warning"  # Only log warnings+ in production

# Restart workers after N requests to prevent memory leaks
max_requests = 1000
max_requests_jitter = 100  # Randomise to avoid thundering herd
