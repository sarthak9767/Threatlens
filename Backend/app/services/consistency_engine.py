import re
from urllib.parse import urlparse


def extract_email_from_header(email_text: str, header_name: str):
    pattern = rf"^{header_name}:\s*(.*)$"

    match = re.search(
        pattern,
        email_text,
        re.IGNORECASE | re.MULTILINE
    )

    if not match:
        return None

    header_value = match.group(1)

    email_match = re.search(
        r'[\w\.-]+@[\w\.-]+\.\w+',
        header_value
    )

    if email_match:
        return email_match.group(0)

    return None


def get_email_domain(email):
    if not email or "@" not in email:
        return None

    return email.split("@")[-1].lower()


def get_url_domain(url):
    try:
        parsed_url = urlparse(url)
        return parsed_url.netloc.lower()
    except Exception:
        return None


def analyze_consistency(
    email_text,
    parsed_data,
    geolocation_data
):
    checks = []
    risk_bonus = 0

    # -----------------------------
    # 1. Sender vs Reply-To
    # -----------------------------

    sender = extract_email_from_header(
        email_text,
        "From"
    )

    reply_to = extract_email_from_header(
        email_text,
        "Reply-To"
    )

    sender_domain = get_email_domain(sender)
    reply_domain = get_email_domain(reply_to)

    if sender_domain and reply_domain:

        if sender_domain != reply_domain:
            checks.append({
                "check": "Sender vs Reply-To",
                "status": "mismatch",
                "details": (
                    f"Sender domain '{sender_domain}' "
                    f"does not match Reply-To domain "
                    f"'{reply_domain}'"
                ),
                "risk": 20
            })

            risk_bonus += 20

        else:
            checks.append({
                "check": "Sender vs Reply-To",
                "status": "consistent",
                "details": "Sender and Reply-To domains match.",
                "risk": 0
            })

    # -----------------------------
    # 2. Sender Domain vs URL Domain
    # -----------------------------

    urls = parsed_data.get("urls", [])

    for url in urls:

        url_domain = get_url_domain(url)

        if (
            sender_domain
            and url_domain
            and sender_domain != url_domain
        ):

            checks.append({
                "check": "Sender vs URL Domain",
                "status": "mismatch",
                "details": (
                    f"Sender domain '{sender_domain}' "
                    f"does not match URL domain "
                    f"'{url_domain}'"
                ),
                "risk": 20
            })

            risk_bonus += 20

        elif sender_domain and url_domain:

            checks.append({
                "check": "Sender vs URL Domain",
                "status": "consistent",
                "details": (
                    "Sender domain and URL domain match."
                ),
                "risk": 0
            })

    # -----------------------------
    # 3. Sender Domain vs IP Org
    # -----------------------------

    for geo in geolocation_data:

        location = geo.get("location", {})

        organization = location.get(
            "organization",
            "Unknown"
        )

        if (
            sender_domain
            and organization != "Unknown"
        ):

            organization_name = (
                organization
                .lower()
                .replace(" ", "")
            )

            sender_name = (
                sender_domain
                .split(".")[0]
                .lower()
                .replace("-", "")
            )

            if sender_name not in organization_name:

                checks.append({
                    "check": "Domain vs IP Organization",
                    "status": "mismatch",
                    "details": (
                        f"Sender domain '{sender_domain}' "
                        f"is not consistent with IP "
                        f"organization '{organization}'"
                    ),
                    "risk": 15
                })

                risk_bonus += 15

    # Limit bonus
    risk_bonus = min(risk_bonus, 50)

    # Final consistency verdict
    if risk_bonus >= 40:
        verdict = "high inconsistency"

    elif risk_bonus >= 20:
        verdict = "suspicious inconsistency"

    else:
        verdict = "consistent"

    return {
        "sender": sender,
        "reply_to": reply_to,
        "risk_bonus": risk_bonus,
        "verdict": verdict,
        "checks": checks
    }