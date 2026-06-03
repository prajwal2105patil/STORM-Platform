"""
ASRE — Gunicorn Production Server Configuration
Run: gunicorn -c gunicorn.conf.py asre.main:app
"""
import multiprocessing

# -- Workers ------------------------------------------------------------------
# Formula: (2 x CPU cores) + 1 — standard for I/O-bound async workloads
workers     = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
threads     = 1   # Uvicorn workers are async -- 1 thread per worker is correct

# -- Network ------------------------------------------------------------------
bind        = "0.0.0.0:8000"
backlog     = 2048          # Max queued connections during burst

# -- Timeouts -----------------------------------------------------------------
timeout          = 30       # Kill worker if silent for 30s
graceful_timeout = 10       # Seconds to finish in-flight requests on shutdown
keepalive        = 5        # Keep-alive connection seconds

# -- Logging ------------------------------------------------------------------
accesslog  = "-"            # stdout
errorlog   = "-"            # stderr
loglevel   = "info"
access_log_format = (
    '{"time":"%(t)s","method":"%(m)s","path":"%(U)s",'
    '"status":%(s)s,"latency_ms":%(D)s,"bytes":%(b)s}'
)

# -- Process ------------------------------------------------------------------
preload_app  = True         # Load app before forking -- catches startup errors fast
max_requests = 1000         # Recycle worker after N requests -- prevents memory leaks
max_requests_jitter = 100   # Randomise restart timing to avoid thundering herd
worker_tmp_dir = "/dev/shm" # Use RAM for worker heartbeats (Linux only)
