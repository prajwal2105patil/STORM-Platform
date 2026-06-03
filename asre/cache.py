"""
ASRE — Response Cache
TTL-based in-memory cache for adjudication results.
Identical claim + station_hint = cache hit, zero DuckDB cost.

Thread-safe via threading.Lock — safe under multi-threaded uvicorn workers.
For multi-process (gunicorn), each worker has its own cache — acceptable tradeoff.
For distributed cache, swap backend to Redis with minimal interface change.
"""
import hashlib
import json
import threading
import time
from typing import Optional

from asre.config import get_settings


class _TTLCache:
    """
    Bounded LRU-ish cache with per-entry TTL.
    Evicts expired entries on access. Caps total size.
    """

    def __init__(self, max_size: int, ttl_seconds: int):
        self._max   = max_size
        self._ttl   = ttl_seconds
        self._store: dict = {}          # key -> (value, expiry_ts)
        self._lock  = threading.Lock()

    def _make_key(self, claim: str, station: Optional[str]) -> str:
        raw = json.dumps({"c": claim.lower().strip(), "s": station}, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, claim: str, station: Optional[str]) -> Optional[dict]:
        key = self._make_key(claim, station)
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() > expiry:
                del self._store[key]
                return None
            return value

    def set(self, claim: str, station: Optional[str], value: dict) -> None:
        key = self._make_key(claim, station)
        expiry = time.monotonic() + self._ttl
        with self._lock:
            # Evict oldest if at capacity
            if len(self._store) >= self._max and key not in self._store:
                oldest = next(iter(self._store))
                del self._store[oldest]
            self._store[key] = (value, expiry)

    def stats(self) -> dict:
        with self._lock:
            now = time.monotonic()
            live = sum(1 for _, (_, exp) in self._store.items() if exp > now)
            return {"total_entries": len(self._store), "live_entries": live}


def _build_cache() -> _TTLCache:
    s = get_settings()
    return _TTLCache(max_size=s.CACHE_MAX_SIZE, ttl_seconds=s.CACHE_TTL_S)


# Module-level singleton — shared across all requests in a worker
CACHE = _build_cache()
