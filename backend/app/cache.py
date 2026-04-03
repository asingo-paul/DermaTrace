"""Simple in-process TTL cache for hot data.

For multi-instance deployments, swap this with Redis (aiocache + redis backend).
This implementation is zero-dependency and works for single-instance Railway/Render deploys.
"""

import asyncio
import time
from typing import Any, Callable, Optional


class TTLCache:
    """Thread-safe async TTL cache backed by a dict."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: Any, ttl: int = 60) -> None:
        async with self._lock:
            self._store[key] = (value, time.monotonic() + ttl)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def delete_prefix(self, prefix: str) -> None:
        async with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]

    async def get_or_set(self, key: str, factory: Callable, ttl: int = 60) -> Any:
        value = await self.get(key)
        if value is not None:
            return value
        value = await factory()
        await self.set(key, value, ttl)
        return value


# Global singleton
cache = TTLCache()
