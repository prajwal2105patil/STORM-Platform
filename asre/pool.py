"""
ASRE — DuckDB Connection Pool
Bounded pool of read-only DuckDB connections.
Concurrent requests draw from the pool; excess requests wait on the semaphore.
No connection is ever shared between threads simultaneously.

DuckDB read-only mode supports concurrent reads safely across threads.
"""
import queue
import threading
import duckdb
from typing import Generator
from contextlib import contextmanager

from asre.config import get_settings


class DuckDBPool:
    def __init__(self, size: int):
        self._size = size
        self._pool: queue.Queue = queue.Queue(maxsize=size)
        self._lock = threading.Lock()
        self._initialized = False

    def initialize(self, data_path: str) -> None:
        """Create all connections upfront at startup. Call once."""
        with self._lock:
            if self._initialized:
                return
            for _ in range(self._size):
                # read_only=False because DuckDB in-memory mode doesn't support it
                # but we never run write operations — the engine is query-only.
                con = duckdb.connect(database=":memory:", read_only=False)
                # Verify data path is reachable on first connection
                con.execute(f"SELECT 1 FROM read_parquet('{data_path}', hive_partitioning=true) LIMIT 1")
                self._pool.put(con)
            self._initialized = True

    @contextmanager
    def acquire(self, timeout: float = 9.0) -> Generator[duckdb.DuckDBPyConnection, None, None]:
        """
        Context manager. Blocks up to `timeout` seconds for a free connection.
        Raises RuntimeError if pool is exhausted (all workers busy).

        Lazily initializes on first use. The FastAPI app warms the pool in its
        lifespan, but scripts, tests and benchmarks call the engine directly
        without that hook — without this, the queue is empty and every acquire
        blocks for `timeout` then falsely reports "pool exhausted".
        """
        if not self._initialized:
            self.initialize(get_settings().DATA_PATH)
        try:
            con = self._pool.get(timeout=timeout)
        except queue.Empty:
            raise RuntimeError(
                f"DuckDB pool exhausted ({self._size} connections all busy). "
                "Increase ASRE_DB_POOL_SIZE or reduce concurrency."
            )
        try:
            yield con
        finally:
            self._pool.put(con)

    def stats(self) -> dict:
        return {
            "pool_size": self._size,
            "available": self._pool.qsize(),
            "in_use": self._size - self._pool.qsize(),
        }


def _build_pool() -> DuckDBPool:
    s = get_settings()
    return DuckDBPool(size=s.DB_POOL_SIZE)


# Module-level singleton
DB_POOL = _build_pool()
