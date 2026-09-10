from fastapi import APIRouter
from pydantic import BaseModel

from app.services.geolocation_service import get_geolocation

router = APIRouter()


class IPRequest(BaseModel):
    ip: str


@router.post("/lookup")
def lookup_ip(data: IPRequest):
    result = get_geolocation(data.ip)

    return {
        "message": "Geolocation lookup completed",
        "data": result
    }