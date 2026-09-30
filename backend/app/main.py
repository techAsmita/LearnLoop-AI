from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db, SessionLocal
from .seed import seed_concepts
from .routers import api


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    db = SessionLocal()
    try:
        seed_concepts(db)
    finally:
        db.close()
    print(
    f"LearnLoop AI started | "
    f"mock_mode={settings.MOCK_MODE} | "
    f"db={'postgres' if 'postgres' in settings.DATABASE_URL else 'sqlite'}"
)
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)


@app.get("/")
def root():
    return {
        "message": "LearnLoop AI API",
        "docs": "/docs",
        "health": "/api/health",
        "mock_mode": settings.MOCK_MODE,
    }
