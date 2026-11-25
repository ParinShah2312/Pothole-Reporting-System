from fastapi import FastAPI

from app.routers import health, verification

app = FastAPI(
    title="Pothole AI Service",
    description="Pothole detection and repair verification for the Smart Civic Pothole System.",
    version="0.1.0",
)

app.include_router(health.router)
app.include_router(verification.router)
