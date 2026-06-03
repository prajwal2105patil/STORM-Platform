"""
ASRE — Production Configuration
All settings load from environment variables with safe defaults.
"""
import os
from functools import lru_cache
from typing import Set


class Settings:
    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str             = os.getenv("ASRE_HOST", "0.0.0.0")
    PORT: int             = int(os.getenv("ASRE_PORT", "8000"))
    WORKERS: int          = int(os.getenv("ASRE_WORKERS", "4"))
    LOG_LEVEL: str        = os.getenv("ASRE_LOG_LEVEL", "info")
    ENV: str              = os.getenv("ASRE_ENV", "production")   # production | development

    # ── Data ──────────────────────────────────────────────────────────────────
    DATA_PATH: str        = os.getenv(
        "ASRE_DATA_PATH",
        os.path.join(os.path.dirname(__file__), "..", "data", "sample",
                     "year=*/month=*/part-0.parquet")
    )
    # BigQuery — injected only for production demo
    BQ_PROJECT: str       = os.getenv("ASRE_BQ_PROJECT", "")
    BQ_DATASET: str       = os.getenv("ASRE_BQ_DATASET", "noaa_isd")
    BQ_TABLE: str         = os.getenv("ASRE_BQ_TABLE", "observations")
    BQ_MAX_BYTES: int     = int(os.getenv("ASRE_BQ_MAX_BYTES", str(10 * 1024 ** 3)))  # 10GB

    # ── Auth ──────────────────────────────────────────────────────────────────
    # Comma-separated list of valid API keys.
    # In production, rotate these and store in a secrets manager.
    API_KEYS_RAW: str     = os.getenv("ASRE_API_KEYS", "dev-key-change-me")

    @property
    def API_KEYS(self) -> Set[str]:
        return {k.strip() for k in self.API_KEYS_RAW.split(",") if k.strip()}

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MIN: int  = int(os.getenv("ASRE_RATE_LIMIT_PER_MIN", "60"))
    RATE_LIMIT_BURST: int    = int(os.getenv("ASRE_RATE_LIMIT_BURST", "10"))

    # ── Performance ───────────────────────────────────────────────────────────
    # Max concurrent DuckDB queries (read-only, thread-safe)
    DB_POOL_SIZE: int        = int(os.getenv("ASRE_DB_POOL_SIZE", "8"))
    # Thread pool workers for sync engine calls
    THREAD_WORKERS: int      = int(os.getenv("ASRE_THREAD_WORKERS", "16"))
    # Hard per-request timeout in seconds
    REQUEST_TIMEOUT_S: float = float(os.getenv("ASRE_REQUEST_TIMEOUT_S", "10.0"))
    # Max claim string length (prevent abuse)
    MAX_CLAIM_LENGTH: int    = int(os.getenv("ASRE_MAX_CLAIM_LENGTH", "2000"))

    # ── Cache ─────────────────────────────────────────────────────────────────
    CACHE_MAX_SIZE: int      = int(os.getenv("ASRE_CACHE_MAX_SIZE", "1024"))
    CACHE_TTL_S: int         = int(os.getenv("ASRE_CACHE_TTL_S", "300"))  # 5 minutes


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
