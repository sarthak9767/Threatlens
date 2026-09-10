CATEGORY_CAPS = {
    "content": 100,
    "consistency": 50,
    "authentication": 50,
}


def get_verdict(score):
    if score >= 60:
        return "high risk"

    if score >= 30:
        return "suspicious"

    return "low risk"


def calculate_risk(
    evidence,
    excluded_ids=None,
):
    excluded_ids = set(
        excluded_ids or []
    )

    category_totals = {
        category: 0
        for category in CATEGORY_CAPS
    }

    for item in evidence:
        if item.get("id") in excluded_ids:
            continue

        category = item.get("category")

        contribution = item.get(
            "risk_contribution",
            0,
        )

        if category not in category_totals:
            continue

        if not isinstance(
            contribution,
            (int, float),
        ):
            continue

        category_totals[category] += max(
            0,
            int(contribution),
        )

    capped_totals = {
        category: min(
            category_totals[category],
            CATEGORY_CAPS[category],
        )
        for category in CATEGORY_CAPS
    }

    raw_score = sum(
        capped_totals.values()
    )

    final_score = min(
        raw_score,
        100,
    )

    return {
        "content_score": capped_totals[
            "content"
        ],
        "consistency_score": capped_totals[
            "consistency"
        ],
        "authentication_score": capped_totals[
            "authentication"
        ],
        "raw_score": raw_score,
        "final_score": final_score,
        "verdict": get_verdict(
            final_score
        ),
    }


def _impact_level(
    score_impact,
    verdict_changed,
):
    if verdict_changed or score_impact >= 20:
        return "high"

    if score_impact >= 10:
        return "medium"

    return "low"


def analyze_counterfactual(evidence):
    original = calculate_risk(
        evidence
    )

    tests = []

    candidates = [
        item
        for item in evidence
        if item.get(
            "risk_contribution",
            0,
        ) > 0
    ]

    for item in candidates:
        recalculated = calculate_risk(
            evidence,
            excluded_ids={
                item["id"]
            },
        )

        score_impact = max(
            0,
            original["final_score"]
            - recalculated["final_score"],
        )

        potential_impact = max(
            0,
            original["raw_score"]
            - recalculated["raw_score"],
        )

        verdict_changed = (
            original["verdict"]
            != recalculated["verdict"]
        )

        tests.append({
            "evidence_id": item["id"],
            "removed_evidence": item["label"],
            "category": item["category"],
            "evidence_value": item["value"],
            "original_score": original[
                "final_score"
            ],
            "new_score": recalculated[
                "final_score"
            ],
            "score_impact": score_impact,
            "potential_impact": potential_impact,
            "original_verdict": original[
                "verdict"
            ],
            "new_verdict": recalculated[
                "verdict"
            ],
            "verdict_changed": verdict_changed,
            "impact_level": _impact_level(
                score_impact,
                verdict_changed,
            ),
            "explanation": (
                f"Removing '{item['label']}' changes the "
                f"risk score from {original['final_score']} "
                f"to {recalculated['final_score']}."
            ),
        })

    tests.sort(
        key=lambda test: (
            test["verdict_changed"],
            test["score_impact"],
            test["potential_impact"],
            test["removed_evidence"],
        ),
        reverse=True,
    )

    strongest = (
        tests[0]
        if tests
        else None
    )

    if not strongest:
        robustness = (
            "no risk-bearing evidence"
        )

        summary = (
            "No positive-risk evidence was available "
            "for counterfactual testing."
        )

    elif strongest["verdict_changed"]:
        robustness = "decision sensitive"

        summary = (
            f"The verdict depends most strongly on "
            f"'{strongest['removed_evidence']}'. "
            f"Removing it changes the verdict from "
            f"{strongest['original_verdict']} to "
            f"{strongest['new_verdict']}."
        )

    elif strongest["score_impact"] >= 20:
        robustness = (
            "moderately dependent"
        )

        summary = (
            f"'{strongest['removed_evidence']}' is the "
            f"strongest dependency and changes the score "
            f"by {strongest['score_impact']} points "
            f"when removed."
        )

    else:
        robustness = (
            "distributed evidence"
        )

        summary = (
            "No single evidence item changes the verdict "
            "by itself; the decision is supported by "
            "multiple signals."
        )

    return {
        "method": "single-evidence removal",
        "original_score": original[
            "final_score"
        ],
        "original_verdict": original[
            "verdict"
        ],
        "risk_breakdown": original,
        "tested_evidence_count": len(tests),
        "robustness": robustness,
        "strongest_dependency": strongest,
        "summary": summary,
        "tests": tests,
        "limitations": (
            "This prototype measures deterministic score "
            "dependency. It does not prove attacker identity "
            "or real-world causation."
        ),
    }