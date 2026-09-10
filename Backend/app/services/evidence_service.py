AUTHENTICATION_RISK = {
    "spf": {
        "fail": 20,
        "softfail": 10,
        "neutral": 5,
        "temperror": 5,
        "permerror": 10,
        "mixed": 15,
    },
    "dkim": {
        "fail": 20,
        "temperror": 5,
        "permerror": 10,
        "mixed": 15,
    },
    "dmarc": {
        "fail": 25,
        "temperror": 5,
        "permerror": 10,
        "policy": 10,
        "mixed": 20,
    },
}


def build_evidence(
    parsed_data,
    threat_data,
    consistency_data,
):
    evidence = []

    def add_evidence(
        evidence_type,
        category,
        label,
        value,
        source,
        confidence,
        risk_contribution=0,
        details="",
    ):
        evidence.append({
            "id": f"EV-{len(evidence) + 1:03d}",
            "type": evidence_type,
            "category": category,
            "label": label,
            "value": value,
            "source": source,
            "confidence": round(float(confidence), 2),
            "risk_contribution": max(
                0,
                int(risk_contribution),
            ),
            "details": details,
        })

    headers = parsed_data.get(
        "headers",
        {},
    )

    header_labels = {
        "from": "From header",
        "reply_to": "Reply-To header",
        "return_path": "Return-Path header",
        "subject": "Subject header",
        "message_id": "Message-ID header",
        "date": "Date header",
    }

    for field, label in header_labels.items():
        value = headers.get(field)

        if value:
            add_evidence(
                evidence_type="header",
                category="metadata",
                label=label,
                value=value,
                source=f"{label} in submitted email",
                confidence=0.95,
                details=(
                    "Observed email metadata; "
                    "not malicious by itself."
                ),
            )

    authentication = parsed_data.get(
        "authentication",
        {},
    )

    for mechanism in (
        "spf",
        "dkim",
        "dmarc",
    ):
        auth_record = authentication.get(
            mechanism,
            {
                "result": "unknown",
                "source": "not present",
                "observations": [],
            },
        )

        result = auth_record.get(
            "result",
            "unknown",
        )

        risk = AUTHENTICATION_RISK.get(
            mechanism,
            {},
        ).get(result, 0)

        if result == "unknown":
            details = (
                f"{mechanism.upper()} result was not present. "
                "Missing evidence is not treated as a failure."
            )
            confidence = 0.5

        elif result == "pass":
            details = (
                f"Observed {mechanism.upper()} pass in the "
                "submitted authentication headers."
            )
            confidence = 0.9

        else:
            details = (
                f"Observed {mechanism.upper()} result "
                f"'{result}' in the submitted "
                "authentication headers."
            )
            confidence = 0.9

        add_evidence(
            evidence_type="authentication",
            category="authentication",
            label=f"{mechanism.upper()} result",
            value=result,
            source=auth_record.get(
                "source",
                "not present",
            ),
            confidence=confidence,
            risk_contribution=risk,
            details=details,
        )

    for word in threat_data.get(
        "suspicious_words",
        [],
    ):
        add_evidence(
            evidence_type="content_signal",
            category="content",
            label=f"Suspicious phrase: {word}",
            value=word,
            source="Submitted email text",
            confidence=0.7,
            risk_contribution=10,
            details=(
                "A suspicious phrase is a supporting signal, "
                "not proof of phishing on its own."
            ),
        )

    for check in consistency_data.get(
        "checks",
        [],
    ):
        risk = check.get(
            "risk",
            0,
        )

        add_evidence(
            evidence_type="consistency_check",
            category="consistency",
            label=check.get(
                "check",
                "Consistency check",
            ),
            value=check.get(
                "status",
                "unknown",
            ),
            source=(
                "Cross-Artifact Consistency Engine"
            ),
            confidence=0.85,
            risk_contribution=risk,
            details=check.get(
                "details",
                "",
            ),
        )

    indicator_groups = (
        (
            "email_address",
            "Email address",
            parsed_data.get("emails", []),
        ),
        (
            "url",
            "URL",
            parsed_data.get("urls", []),
        ),
        (
            "domain",
            "Domain",
            parsed_data.get("domains", []),
        ),
        (
            "ip_address",
            "IP address",
            parsed_data.get("ips", []),
        ),
    )

    for evidence_type, label, values in indicator_groups:
        for value in values:
            add_evidence(
                evidence_type=evidence_type,
                category="indicator",
                label=label,
                value=value,
                source=(
                    "Extracted from submitted email"
                ),
                confidence=0.8,
                details=(
                    "Extracted indicator; reputation is not "
                    "inferred without a threat-intelligence result."
                ),
            )

    return evidence
