"""DermaTrace FastAPI application entry point."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="DermaTrace API",
    version="0.1.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENV != "production" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# HSTS middleware (production only)
# ---------------------------------------------------------------------------
@app.middleware("http")
async def hsts_middleware(request: Request, call_next: Any) -> Any:
    response = await call_next(request)
    if settings.ENV == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Return service liveness status."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Router includes (uncomment as routers are implemented)
# ---------------------------------------------------------------------------
from app.routers import auth
app.include_router(auth.router, prefix="/auth", tags=["auth"])

from app.routers import profile
app.include_router(profile.router, prefix="/profile", tags=["profile"])

from app.routers import products
app.include_router(products.router, prefix="/products", tags=["products"])

from app.routers import reactions
app.include_router(reactions.router, prefix="/reactions", tags=["reactions"])

from app.routers import dashboard
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

from app.routers import analysis
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])

from app.routers import recommendations
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])

from app.routers import ingredients
app.include_router(ingredients.router, prefix="/ingredients", tags=["ingredients"])

from app.routers import subscription
app.include_router(subscription.router, prefix="/subscription", tags=["subscription"])

from app.routers import payments
app.include_router(payments.router, prefix="/payments", tags=["payments"])

from app.routers import sync
app.include_router(sync.router, prefix="/sync", tags=["sync"])
