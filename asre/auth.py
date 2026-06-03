"""
ASRE — API Key Authentication
Every request must carry a valid X-API-Key header.
Invalid keys return 401 before touching the engine.
"""
from fastapi import Header, HTTPException, status
from typing import Optional
from asre.config import get_settings


async def require_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    FastAPI dependency. Validates X-API-Key header.
    Returns the key on success so downstream can use it for rate-limit keying.
    """
    settings = get_settings()

    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if x_api_key not in settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return x_api_key
