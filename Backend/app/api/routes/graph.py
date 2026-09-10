from fastapi import APIRouter
from pydantic import BaseModel

from app.services.email_parser import parse_email
from app.services.geolocation_service import get_geolocation
from app.services.graph_service import build_graph

router = APIRouter()


class GraphRequest(BaseModel):
    email_text: str


@router.post("/build")
def build_email_graph(data: GraphRequest):
    parsed_data = parse_email(data.email_text)

    geolocation_results = []

    for ip in parsed_data["ips"]:
        geolocation_results.append(get_geolocation(ip))

    graph_data = build_graph(
        parsed_data,
        geolocation_results
    )

    return {
        "message": "Graph generated successfully",
        "graph": graph_data
    }