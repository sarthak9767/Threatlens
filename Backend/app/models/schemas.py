from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class EmailRequest(BaseModel):
    email_text: str


class BatchEmailItem(BaseModel):
    id: Optional[str] = None
    source: str = "gmail-selection"
    sender: Optional[str] = None
    subject: Optional[str] = None
    email_text: str


class BatchAnalysisRequest(BaseModel):
    emails: List[BatchEmailItem]


class ParsedData(BaseModel):
    source_type: str
    headers: Dict[str, Any]
    authentication: Dict[str, Any]
    emails: List[str]
    urls: List[str]
    domains: List[str]
    ips: List[str]


class ThreatAnalysis(BaseModel):
    risk_score: int
    verdict: str
    suspicious_words: List[str]
    base_risk_score: int = 0
    consistency_bonus: int = 0
    authentication_bonus: int = 0


class AnalysisResponse(BaseModel):
    message: str
    parsed_data: Dict[str, Any]
    threat_analysis: Dict[str, Any]
    ip_analysis: List[Dict[str, Any]]
    geolocation: List[Dict[str, Any]]
    consistency_analysis: Dict[str, Any]
    authentication_analysis: Dict[str, Any]
    evidence: List[Dict[str, Any]]
    counterfactual_analysis: Dict[str, Any]
    graph: Dict[str, Any]


class BatchAnalysisResponse(BaseModel):
    message: str
    report_id: str
    report_title: str
    generated_at: str
    summary: Dict[str, Any]
    results: List[Dict[str, Any]]
