import ipaddress
import re
from email import policy
from email.parser import Parser
from email.utils import getaddresses
from urllib.parse import urlparse


EMAIL_PATTERN = re.compile(
    r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+"
)

URL_PATTERN = re.compile(
    r"https?://[^\s<>\"']+",
    re.IGNORECASE,
)

IPV4_PATTERN = re.compile(
    r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])"
)

AUTH_RESULTS = {
    "pass",
    "fail",
    "softfail",
    "neutral",
    "none",
    "temperror",
    "permerror",
    "policy",
}

MAX_INDICATORS_PER_TYPE = 100


def _unique(values):
    seen = set()
    result = []

    for value in values:
        if value is None:
            continue

        normalized = str(value).strip()

        if not normalized:
            continue

        key = normalized.lower()

        if key in seen:
            continue

        seen.add(key)
        result.append(normalized)

    return result[:MAX_INDICATORS_PER_TYPE]


def _clean_url(url):
    return url.rstrip(".,;:!?)]}>\"")


def _valid_ipv4(value):
    try:
        parsed = ipaddress.ip_address(value)
        return str(parsed) if parsed.version == 4 else None
    except ValueError:
        return None


def _header_value(message, name):
    value = message.get(name)
    return str(value).strip() if value else None


def _extract_authentication_result(
    authentication_headers,
    mechanism,
    received_spf_headers=None,
):
    observations = []

    pattern = re.compile(
        rf"\b{re.escape(mechanism)}\s*=\s*"
        rf"({'|'.join(sorted(AUTH_RESULTS))})\b",
        re.IGNORECASE,
    )

    for header in authentication_headers:
        observations.extend(
            match.lower()
            for match in pattern.findall(header)
        )

    source = "Authentication-Results header"

    if mechanism == "spf" and not observations:
        received_spf_headers = received_spf_headers or []
        fallback_pattern = re.compile(
            rf"^\s*({'|'.join(sorted(AUTH_RESULTS))})\b",
            re.IGNORECASE,
        )

        for header in received_spf_headers:
            match = fallback_pattern.search(header)
            if match:
                observations.append(match.group(1).lower())

        if observations:
            source = "Received-SPF header"

    unique_observations = _unique(observations)

    if not unique_observations:
        return {
            "result": "unknown",
            "source": "not present",
            "observations": [],
        }

    result = (
        unique_observations[0]
        if len(unique_observations) == 1
        else "mixed"
    )

    return {
        "result": result,
        "source": source,
        "observations": unique_observations,
    }


def parse_email(email_text: str):
    if not isinstance(email_text, str):
        raise TypeError("email_text must be a string")

    message = Parser(policy=policy.default).parsestr(email_text)

    headers = {
        "from": _header_value(message, "From"),
        "reply_to": _header_value(message, "Reply-To"),
        "return_path": _header_value(message, "Return-Path"),
        "subject": _header_value(message, "Subject"),
        "message_id": _header_value(message, "Message-ID"),
        "date": _header_value(message, "Date"),
    }

    address_headers = [
        value
        for name in (
            "From",
            "Reply-To",
            "Return-Path",
            "To",
            "Cc",
        )
        for value in message.get_all(name, [])
    ]

    header_addresses = [
        address
        for _, address in getaddresses(address_headers)
        if address
    ]

    regex_addresses = EMAIL_PATTERN.findall(email_text)
    emails = _unique(header_addresses + regex_addresses)

    urls = _unique(
        _clean_url(url)
        for url in URL_PATTERN.findall(email_text)
    )

    ip_candidates = IPV4_PATTERN.findall(email_text)
    ips = _unique(
        valid_ip
        for candidate in ip_candidates
        if (valid_ip := _valid_ipv4(candidate))
    )

    domains = []

    for address in emails:
        if "@" in address:
            domains.append(address.rsplit("@", 1)[1].lower())

    for url in urls:
        try:
            hostname = urlparse(url).hostname
        except ValueError:
            hostname = None

        if hostname:
            domains.append(hostname.lower())

    authentication_headers = [
        str(value)
        for value in message.get_all(
            "Authentication-Results",
            [],
        )
    ]

    received_spf_headers = [
        str(value)
        for value in message.get_all(
            "Received-SPF",
            [],
        )
    ]

    authentication = {
        mechanism: _extract_authentication_result(
            authentication_headers,
            mechanism,
            received_spf_headers,
        )
        for mechanism in ("spf", "dkim", "dmarc")
    }

    return {
        "source_type": (
            "rfc822"
            if list(message.keys())
            else "plain_text"
        ),
        "headers": headers,
        "authentication": authentication,
        "emails": emails,
        "urls": urls,
        "domains": _unique(domains),
        "ips": ips,
    }