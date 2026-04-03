"""DermaTrace FastAPI application — production-optimised entry point."""

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings
from app.database import engine

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Lifespan — warm up / tear down
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    """Warm up DB pool on startup, dispose on shutdown."""
    logger.info("DermaTrace API starting up...")
    # Pre-warm the connection pool
    async with engine.connect() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    logger.info("DB pool warmed up.")
    yield
    logger.info("DermaTrace API shutting down...")
    await engine.dispose()


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address, default_limits=["1000/minute"])

app = FastAPI(
    title="DermaTrace API",
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
    # Disable OpenAPI schema in production for security + speed
    openapi_url="/openapi.json" if settings.ENV != "production" else None,
)

# ---------------------------------------------------------------------------
# Middleware stack (order matters — outermost runs first)
# ---------------------------------------------------------------------------

# GZip all responses > 1KB — reduces bandwidth by ~70%
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENV != "production" else [
        "https://dermatrace.app",
        "https://www.dermatrace.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=86400,  # Cache preflight for 24h
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# Request ID + timing middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def request_middleware(request: Request, call_next: Any) -> Any:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start = time.perf_counter()

    response = await call_next(request)

    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"

    if settings.ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"

    # Log slow requests
    if duration_ms > 1000:
        logger.warning(
            "Slow request: %s %s took %.0fms [%s]",
            request.method, request.url.path, duration_ms, request_id,
        )

    return response


# ---------------------------------------------------------------------------
# Exception handlers
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
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"], include_in_schema=False)
async def health_check() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from app.routers import auth, profile, products, reactions, dashboard
from app.routers import analysis, recommendations, ingredients, subscription, payments, sync

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(reactions.router, prefix="/reactions", tags=["reactions"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
app.include_router(ingredients.router, prefix="/ingredients", tags=["ingredients"])
app.include_router(subscription.router, prefix="/subscription", tags=["subscription"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(sync.router, prefix="/sync", tags=["sync"])
