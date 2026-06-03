"""
DREADNOUGHT -- ASRE FastAPI Application (Production Grade v2.0)

Hardening layers (outermost to innermost):
  1. API Key auth       -- rejects unauthenticated requests before engine
  2. Rate limiter       -- 60 req/min per key, sliding window
  3. Input validation   -- claim length cap, station ID pattern
  4. Request timeout    -- 10s hard limit, returns 504 on breach
  5. Response cache     -- TTL cache, identical claims skip DuckDB entirely
  6. Thread pool        -- sync LangGraph engine off the async event loop
  7. DuckDB pool        -- bounded connection pool, no per-request connect/close
  8. Structured logging -- JSON logs with request_id, latency, api_key prefix
"""

import asyncio
import json
import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from asre.auth import require_api_key
from asre.cache import CACHE
from asre.config import get_settings
from asre.engine import resolve_claim
from asre.pool import DB_POOL

# -- Structured JSON logger ---------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":%(message)s}',
)
logger = logging.getLogger("asre")

settings = get_settings()

# -- Thread pool for sync engine calls ----------------------------------------
_EXECUTOR = ThreadPoolExecutor(
    max_workers=settings.THREAD_WORKERS,
    thread_name_prefix="asre-worker",
)


# -- Lifespan: warm up pool on startup ----------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(json.dumps({
        "event": "startup",
        "env": settings.ENV,
        "db_pool_size": settings.DB_POOL_SIZE,
        "thread_workers": settings.THREAD_WORKERS,
        "cache_ttl_s": settings.CACHE_TTL_S,
    }))
    try:
        DB_POOL.initialize(settings.DATA_PATH)
        logger.info(json.dumps({"event": "db_pool_ready", **DB_POOL.stats()}))
    except Exception as e:
        logger.error(json.dumps({"event": "db_pool_failed", "error": str(e)}))
        raise

    yield  # application runs

    logger.info(json.dumps({"event": "shutdown"}))
    _EXECUTOR.shutdown(wait=False)


# -- App ----------------------------------------------------------------------
app = FastAPI(
    title="ASRE -- Autonomous Service Resolution Engine",
    description=(
        "Replaces 60-day / Rs.50-lakh legal adjudication with a sub-5-second API call. "
        "Powered by NOAA ISD public records (Rule 803(8) admissible)."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# -- Request ID + timing middleware -------------------------------------------
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.start_time = time.monotonic()
    response = await call_next(request)
    elapsed_ms = int((time.monotonic() - request.state.start_time) * 1000)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
    return response


# -- Rate limiter (sliding window per API key) ---------------------------------
_rate_store: dict = {}
_rate_lock = threading.Lock()


def _check_rate_limit(api_key: str) -> bool:
    now = time.monotonic()
    window = 60.0
    limit = settings.RATE_LIMIT_PER_MIN
    with _rate_lock:
        timestamps = _rate_store.get(api_key, [])
        _rate_store[api_key] = [t for t in timestamps if now - t < window]
        if len(_rate_store[api_key]) >= limit:
            return False
        _rate_store[api_key].append(now)
        return True


# -- Schemas ------------------------------------------------------------------
class ClaimRequest(BaseModel):
    claim: str = Field(
        ...,
        min_length=10,
        description="Natural language SLA or force majeure weather claim.",
        example="Hurricane-force winds at Kutch in August 2023 caused generation shortfall.",
    )
    station: Optional[str] = Field(
        None,
        pattern=r"^\d{11}$",
        description="Optional 11-digit NOAA WMO station ID to restrict the query.",
        example="42840",
    )
    asset_lat: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Asset latitude (WGS84 decimal degrees). Enables real IDW spatial weighting.",
        example=23.1312,
    )
    asset_lon: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Asset longitude (WGS84 decimal degrees). Enables real IDW spatial weighting.",
        example=68.9296,
    )

    @field_validator("claim")
    @classmethod
    def claim_max_length(cls, v: str) -> str:
        limit = get_settings().MAX_CLAIM_LENGTH
        if len(v) > limit:
            raise ValueError(f"Claim exceeds {limit} character limit.")
        return v


class AdjudicationResponse(BaseModel):
    claim_status:        str
    resolution_time_ms:  int
    evidence:            Optional[dict]
    data_provenance:     str
    disclaimer:          str    # Legal liability shield — always present in output
    rejection_reason:    Optional[str] = None
    request_id:          Optional[str] = None
    cache_hit:           bool = False


# -- Core endpoint ------------------------------------------------------------
@app.post(
    "/adjudicate",
    response_model=AdjudicationResponse,
    summary="Adjudicate an SLA or force majeure weather claim",
    tags=["ASRE"],
    responses={
        401: {"description": "Missing or invalid API key"},
        422: {"description": "Claim validation failed"},
        429: {"description": "Rate limit exceeded"},
        504: {"description": "Engine timeout"},
    },
)
async def adjudicate(
    request: Request,
    body: ClaimRequest,
    api_key: str = Depends(require_api_key),
):
    request_id = getattr(request.state, "request_id", "unknown")

    # Rate limit check
    if not _check_rate_limit(api_key):
        logger.warning(json.dumps({
            "event": "rate_limited",
            "api_key_prefix": api_key[:8],
            "request_id": request_id,
        }))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {settings.RATE_LIMIT_PER_MIN} req/min.",
            headers={"Retry-After": "60"},
        )

    # Cache check -- skip engine entirely on hit
    cached = CACHE.get(body.claim, body.station)
    if cached is not None:
        logger.info(json.dumps({
            "event": "cache_hit",
            "request_id": request_id,
            "api_key_prefix": api_key[:8],
        }))
        return AdjudicationResponse(**cached, request_id=request_id, cache_hit=True)

    # Run sync engine in thread pool -- never blocks event loop
    # Pass asset coordinates if provided — unlocks real IDW spatial weighting
    import functools
    engine_call = functools.partial(
        resolve_claim,
        body.claim,
        body.station,
        body.asset_lat,
        body.asset_lon,
    )
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(_EXECUTOR, engine_call),
            timeout=settings.REQUEST_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        logger.error(json.dumps({
            "event": "timeout",
            "request_id": request_id,
            "claim_len": len(body.claim),
        }))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Engine timeout after {settings.REQUEST_TIMEOUT_S}s. Narrow your date range.",
        )

    if result is None:
        raise HTTPException(status_code=500, detail="Engine returned no result.")

    logger.info(json.dumps({
        "event": "adjudication",
        "request_id": request_id,
        "api_key_prefix": api_key[:8],
        "claim_status": result.get("claim_status"),
        "resolution_ms": result.get("resolution_time_ms"),
    }))

    # Cache validated/rejected results (not infra errors)
    if result.get("claim_status") in ("VALIDATED", "REJECTED"):
        CACHE.set(body.claim, body.station, result)

    return AdjudicationResponse(**result, request_id=request_id, cache_hit=False)


# -- Health -------------------------------------------------------------------
@app.get("/health", tags=["Ops"])
async def health():
    pool_stats = DB_POOL.stats()
    cache_stats = CACHE.stats()
    if pool_stats["available"] == 0:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded", "reason": "DuckDB pool exhausted", "pool": pool_stats},
        )
    return {
        "status": "operational",
        "engine": "ASRE v2.0",
        "backend": "DuckDB (local)" if not settings.BQ_PROJECT else "BigQuery",
        "pool": pool_stats,
        "cache": cache_stats,
        "rate_limit": f"{settings.RATE_LIMIT_PER_MIN} req/min per key",
    }


# -- Metrics (authenticated) --------------------------------------------------
@app.get("/metrics", tags=["Ops"])
async def metrics(api_key: str = Depends(require_api_key)):
    return {
        "pool": DB_POOL.stats(),
        "cache": CACHE.stats(),
        "active_rate_limit_keys": len(_rate_store),
        "thread_pool_pending": _EXECUTOR._work_queue.qsize(),
    }


# -- Root ---------------------------------------------------------------------
@app.get("/", tags=["Ops"])
async def root():
    return {
        "service":    "DREADNOUGHT ASRE",
        "version":    "2.0.0",
        "docs":       "/docs",
        "adjudicate": "POST /adjudicate  (requires X-API-Key header)",
        "health":     "GET  /health",
    }
