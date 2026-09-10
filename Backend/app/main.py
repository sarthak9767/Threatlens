import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analysis import router as analysis_router
from app.api.routes.geolocation import router as geolocation_router
from app.api.routes.graph import router as graph_router


app = FastAPI(
    title="Threat Lens Prototype Backend",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    analysis_router,
    prefix="/api/analysis",
    tags=["Analysis"],
)

app.include_router(
    geolocation_router,
    prefix="/api/geolocation",
    tags=["Geolocation"],
)

app.include_router(
    graph_router,
    prefix="/api/graph",
    tags=["Graph"],
)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Threat Lens Prototype backend is running.",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
