from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import (
    AnalysisResponse,
    BatchAnalysisRequest,
    BatchAnalysisResponse,
    EmailRequest,
)
from app.services.consistency_engine import analyze_consistency
from app.services.counterfactual_service import analyze_counterfactual
from app.services.email_parser import parse_email
from app.services.evidence_service import build_evidence
from app.services.geolocation_service import get_geolocation
from app.services.graph_service import build_graph
from app.services.ip_analyzer import analyze_ip
from app.services.threat_analyzer import analyze_threat


router = APIRouter()


def run_analysis(email_text: str):
    parsed_data = parse_email(email_text)
    threat_data = analyze_threat(email_text)

    ip_results = []
    geolocation_results = []

    for ip in parsed_data["ips"]:
        ip_results.append(analyze_ip(ip))
        geolocation_results.append(get_geolocation(ip))

    consistency_data = analyze_consistency(
        email_text,
        parsed_data,
        geolocation_results,
    )

    evidence = build_evidence(
        parsed_data,
        threat_data,
        consistency_data,
    )

    counterfactual_data = analyze_counterfactual(evidence)
    risk_breakdown = counterfactual_data["risk_breakdown"]

    threat_data["base_risk_score"] = risk_breakdown["content_score"]
    threat_data["consistency_bonus"] = risk_breakdown[
        "consistency_score"
    ]
    threat_data["authentication_bonus"] = risk_breakdown[
        "authentication_score"
    ]
    threat_data["risk_score"] = risk_breakdown["final_score"]
    threat_data["verdict"] = risk_breakdown["verdict"]

    graph_data = build_graph(parsed_data, geolocation_results)
    graph_data["counterfactual_analysis"] = counterfactual_data

    return {
        "message": "Email analyzed successfully",
        "parsed_data": parsed_data,
        "threat_analysis": threat_data,
        "ip_analysis": ip_results,
        "geolocation": geolocation_results,
        "consistency_analysis": consistency_data,
        "authentication_analysis": parsed_data["authentication"],
        "evidence": evidence,
        "counterfactual_analysis": counterfactual_data,
        "graph": graph_data,
    }


@router.post(
    "/analyze-batch",
    response_model=BatchAnalysisResponse,
)
def analyze_email_batch(data: BatchAnalysisRequest):
    email_count = len(data.emails)

    if email_count < 5:
        raise HTTPException(
            status_code=400,
            detail="Select at least 5 emails for batch analysis.",
        )

    if email_count > 25:
        raise HTTPException(
            status_code=400,
            detail="A maximum of 25 emails can be analyzed at once.",
        )

    results = []
    risk_distribution = {
        "high_risk": 0,
        "suspicious": 0,
        "low_risk": 0,
    }
    risk_scores = []
    failed_count = 0

    for position, item in enumerate(data.emails, start=1):
        email_text = item.email_text.strip()

        if not email_text:
            failed_count += 1
            results.append({
                "position": position,
                "email_id": item.id or f"email-{position}",
                "source": item.source,
                "sender": item.sender or "Not detected",
                "subject": item.subject or f"Email {position}",
                "status": "failed",
                "error": "Email content is empty.",
                "analysis": None,
            })
            continue

        try:
            analysis = run_analysis(email_text)
            score = analysis["threat_analysis"]["risk_score"]
            verdict = analysis["threat_analysis"]["verdict"]

            risk_scores.append(score)

            if verdict == "high risk":
                risk_distribution["high_risk"] += 1
            elif verdict == "suspicious":
                risk_distribution["suspicious"] += 1
            else:
                risk_distribution["low_risk"] += 1

            results.append({
                "position": position,
                "email_id": item.id or f"email-{position}",
                "source": item.source,
                "sender": item.sender or "Not detected",
                "subject": item.subject or f"Email {position}",
                "status": "analyzed",
                "error": None,
                "analysis": analysis,
            })
        except Exception as error:
            failed_count += 1
            results.append({
                "position": position,
                "email_id": item.id or f"email-{position}",
                "source": item.source,
                "sender": item.sender or "Not detected",
                "subject": item.subject or f"Email {position}",
                "status": "failed",
                "error": str(error),
                "analysis": None,
            })

    successful_count = email_count - failed_count
    average_score = (
        round(sum(risk_scores) / len(risk_scores), 2)
        if risk_scores
        else 0
    )

    return {
        "message": "Batch email analysis completed",
        "report_id": f"TL-{uuid4().hex[:12].upper()}",
        "report_title": "Threat Lens Multi-Email Analysis Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_emails": email_count,
            "successful_analyses": successful_count,
            "failed_analyses": failed_count,
            "average_risk_score": average_score,
            "maximum_risk_score": max(risk_scores, default=0),
            "risk_distribution": risk_distribution,
        },
        "results": results,
    }


@router.get("/")
def analysis_status():
    return {"status": "Analysis service is ready."}


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_email(data: EmailRequest):
    if not data.email_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Email text cannot be empty.",
        )

    return run_analysis(data.email_text)


@router.post("/upload", response_model=AnalysisResponse)
async def upload_email(file: UploadFile = File(...)):
    filename = file.filename or ""

    if not filename.lower().endswith(".eml"):
        raise HTTPException(
            status_code=400,
            detail="Only .eml files are supported",
        )

    content = await file.read()

    try:
        email_text = content.decode("utf-8")
    except UnicodeDecodeError:
        email_text = content.decode("latin-1", errors="ignore")

    if not email_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Uploaded email file is empty.",
        )

    return run_analysis(email_text)
