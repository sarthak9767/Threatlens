def analyze_threat(email_text: str):
    suspicious_words = [
        "verify",
        "urgent",
        "password",
        "blocked",
        "login",
        "click here",
        "account suspended",
        "update account"
    ]

    found_words = []
    risk_score = 0

    text = email_text.lower()

    for word in suspicious_words:
        if word in text:
            found_words.append(word)
            risk_score += 10

    risk_score = min(risk_score, 100)

    if risk_score >= 60:
        verdict = "high risk"
    elif risk_score >= 30:
        verdict = "suspicious"
    else:
        verdict = "low risk"

    return {
        "risk_score": risk_score,
        "verdict": verdict,
        "suspicious_words": found_words
    }