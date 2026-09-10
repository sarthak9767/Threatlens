const SUSPICIOUS_WORDS = [
  "verify",
  "urgent",
  "password",
  "blocked",
  "login",
  "click here",
  "account suspended",
  "update account",
]

const AUTH_RISK = {
  spf: {
    fail: 20,
    softfail: 10,
    neutral: 5,
    temperror: 5,
    permerror: 10,
    mixed: 15,
  },
  dkim: {
    fail: 20,
    temperror: 5,
    permerror: 10,
    mixed: 15,
  },
  dmarc: {
    fail: 25,
    temperror: 5,
    permerror: 10,
    policy: 10,
    mixed: 20,
  },
}

const CATEGORY_CAPS = {
  content: 100,
  consistency: 50,
  authentication: 50,
}

function unique(values) {
  return [...new Set(
    values
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)
  )]
}

function parseHeaders(emailText) {
  const headerBlock = emailText.split(/\r?\n\r?\n/, 1)[0]
  const unfolded = headerBlock.replace(/\r?\n[\t ]+/g, " ")
  const headers = {}

  unfolded.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(":")

    if (separator <= 0) {
      return
    }

    const name = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (name && value) {
      headers[name] = headers[name]
        ? `${headers[name]}; ${value}`
        : value
    }
  })

  return headers
}

function extractAddress(value) {
  if (!value) {
    return null
  }

  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null
}

function getDomainFromEmail(value) {
  const address = extractAddress(value)
  return address?.split("@")[1]?.toLowerCase() || null
}

function getDomainFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

function getAuthentication(headers, mechanism) {
  const authenticationText = [
    headers["authentication-results"],
    mechanism === "spf" ? headers["received-spf"] : "",
  ].filter(Boolean).join("; ")

  const statuses = [
    "pass",
    "fail",
    "softfail",
    "neutral",
    "none",
    "temperror",
    "permerror",
    "policy",
  ]

  const regularExpression = new RegExp(
    `\\b${mechanism}\\s*=\\s*(${statuses.join("|")})\\b`,
    "gi"
  )

  const observations = unique(
    [...authenticationText.matchAll(regularExpression)]
      .map((match) => match[1].toLowerCase())
  )

  return {
    result: observations.length === 0
      ? "unknown"
      : observations.length === 1
        ? observations[0]
        : "mixed",
    source: observations.length > 0
      ? "Authentication-Results header"
      : "not present",
    observations,
  }
}

function verdictFor(score) {
  if (score >= 60) return "high risk"
  if (score >= 30) return "suspicious"
  return "low risk"
}

function calculateRisk(evidence, excludedIds = new Set()) {
  const totals = {
    content: 0,
    consistency: 0,
    authentication: 0,
  }

  evidence.forEach((item) => {
    if (excludedIds.has(item.id) || !(item.category in totals)) {
      return
    }

    totals[item.category] += Math.max(
      0,
      Number(item.risk_contribution) || 0
    )
  })

  const capped = Object.fromEntries(
    Object.entries(totals).map(([category, total]) => [
      category,
      Math.min(total, CATEGORY_CAPS[category]),
    ])
  )

  const rawScore = capped.content
    + capped.consistency
    + capped.authentication

  const finalScore = Math.min(rawScore, 100)

  return {
    content_score: capped.content,
    consistency_score: capped.consistency,
    authentication_score: capped.authentication,
    raw_score: rawScore,
    final_score: finalScore,
    verdict: verdictFor(finalScore),
  }
}

function counterfactualAnalysis(evidence) {
  const original = calculateRisk(evidence)

  const tests = evidence
    .filter((item) => item.risk_contribution > 0)
    .map((item) => {
      const recalculated = calculateRisk(
        evidence,
        new Set([item.id])
      )

      const scoreImpact = Math.max(
        0,
        original.final_score - recalculated.final_score
      )

      const potentialImpact = Math.max(
        0,
        original.raw_score - recalculated.raw_score
      )

      const verdictChanged = original.verdict !== recalculated.verdict

      return {
        evidence_id: item.id,
        removed_evidence: item.label,
        category: item.category,
        evidence_value: item.value,
        original_score: original.final_score,
        new_score: recalculated.final_score,
        score_impact: scoreImpact,
        potential_impact: potentialImpact,
        original_verdict: original.verdict,
        new_verdict: recalculated.verdict,
        verdict_changed: verdictChanged,
        impact_level: verdictChanged || scoreImpact >= 20
          ? "high"
          : scoreImpact >= 10
            ? "medium"
            : "low",
        explanation: `Removing '${item.label}' changes the risk score from ${original.final_score} to ${recalculated.final_score}.`,
      }
    })
    .sort((first, second) => {
      return Number(second.verdict_changed) - Number(first.verdict_changed)
        || second.score_impact - first.score_impact
        || second.potential_impact - first.potential_impact
    })

  const strongest = tests[0] || null
  let robustness = "no risk-bearing evidence"
  let summary = "No positive-risk evidence was available for counterfactual testing."

  if (strongest?.verdict_changed) {
    robustness = "decision sensitive"
    summary = `The verdict depends most strongly on '${strongest.removed_evidence}'. Removing it changes the verdict from ${strongest.original_verdict} to ${strongest.new_verdict}.`
  } else if (strongest?.score_impact >= 20) {
    robustness = "moderately dependent"
    summary = `'${strongest.removed_evidence}' is the strongest dependency and changes the score by ${strongest.score_impact} points when removed.`
  } else if (strongest) {
    robustness = "distributed evidence"
    summary = "No single evidence item changes the verdict by itself; the decision is supported by multiple signals."
  }

  return {
    method: "single-evidence removal",
    original_score: original.final_score,
    original_verdict: original.verdict,
    risk_breakdown: original,
    tested_evidence_count: tests.length,
    robustness,
    strongest_dependency: strongest,
    summary,
    tests,
    limitations: "This browser demo measures deterministic score dependency. It does not prove attacker identity or real-world causation.",
  }
}

export function analyzeEmailLocally(emailText) {
  const headers = parseHeaders(emailText)
  const lowerText = emailText.toLowerCase()

  const emails = unique(
    emailText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
  )

  const urls = unique(
    (emailText.match(/https?:\/\/[^\s<>"']+/gi) || [])
      .map((url) => url.replace(/[.,;:!?\])}>]+$/, ""))
  )

  const ips = unique(
    (emailText.match(/(?:\d{1,3}\.){3}\d{1,3}/g) || [])
      .filter((ip) => ip.split(".").every((part) => Number(part) <= 255))
  )

  const domains = unique([
    ...emails.map((email) => email.split("@")[1]?.toLowerCase()),
    ...urls.map(getDomainFromUrl),
  ])

  const authentication = Object.fromEntries(
    ["spf", "dkim", "dmarc"].map((mechanism) => [
      mechanism,
      getAuthentication(headers, mechanism),
    ])
  )

  const parsedData = {
    source_type: Object.keys(headers).length > 0 ? "rfc822" : "plain_text",
    headers: {
      from: headers.from || null,
      reply_to: headers["reply-to"] || null,
      return_path: headers["return-path"] || null,
      subject: headers.subject || null,
      message_id: headers["message-id"] || null,
      date: headers.date || null,
    },
    authentication,
    emails,
    urls,
    domains,
    ips,
  }

  const suspiciousWords = SUSPICIOUS_WORDS.filter(
    (word) => lowerText.includes(word)
  )

  const checks = []
  const senderDomain = getDomainFromEmail(headers.from)
  const replyDomain = getDomainFromEmail(headers["reply-to"])

  if (senderDomain && replyDomain) {
    const mismatch = senderDomain !== replyDomain
    checks.push({
      check: "Sender vs Reply-To",
      status: mismatch ? "mismatch" : "consistent",
      details: mismatch
        ? `Sender domain '${senderDomain}' does not match Reply-To domain '${replyDomain}'.`
        : "Sender and Reply-To domains match.",
      risk: mismatch ? 20 : 0,
    })
  }

  urls.forEach((url) => {
    const urlDomain = getDomainFromUrl(url)

    if (senderDomain && urlDomain) {
      const mismatch = senderDomain !== urlDomain
      checks.push({
        check: "Sender vs URL Domain",
        status: mismatch ? "mismatch" : "consistent",
        details: mismatch
          ? `Sender domain '${senderDomain}' does not match URL domain '${urlDomain}'.`
          : "Sender domain and URL domain match.",
        risk: mismatch ? 20 : 0,
      })
    }
  })

  const riskBonus = Math.min(
    checks.reduce((total, check) => total + check.risk, 0),
    50
  )

  const consistency = {
    sender: extractAddress(headers.from),
    reply_to: extractAddress(headers["reply-to"]),
    risk_bonus: riskBonus,
    verdict: riskBonus >= 40
      ? "high inconsistency"
      : riskBonus >= 20
        ? "suspicious inconsistency"
        : "consistent",
    checks,
  }

  const evidence = []
  const addEvidence = (item) => evidence.push({
    id: `EV-${String(evidence.length + 1).padStart(3, "0")}`,
    risk_contribution: 0,
    ...item,
  })

  Object.entries(parsedData.headers).forEach(([field, value]) => {
    if (value) {
      addEvidence({
        type: "header",
        category: "metadata",
        label: `${field.replaceAll("_", " ")} header`,
        value,
        source: "Submitted email header",
        confidence: 0.95,
        details: "Observed email metadata; not malicious by itself.",
      })
    }
  })

  Object.entries(authentication).forEach(([mechanism, record]) => {
    addEvidence({
      type: "authentication",
      category: "authentication",
      label: `${mechanism.toUpperCase()} result`,
      value: record.result,
      source: record.source,
      confidence: record.result === "unknown" ? 0.5 : 0.9,
      risk_contribution: AUTH_RISK[mechanism]?.[record.result] || 0,
      details: record.result === "unknown"
        ? `${mechanism.toUpperCase()} result was not present. Missing evidence is not treated as a failure.`
        : `Observed ${mechanism.toUpperCase()} result '${record.result}'.`,
    })
  })

  suspiciousWords.forEach((word) => addEvidence({
    type: "content_signal",
    category: "content",
    label: `Suspicious phrase: ${word}`,
    value: word,
    source: "Submitted email text",
    confidence: 0.7,
    risk_contribution: 10,
    details: "A suspicious phrase is a supporting signal, not proof of phishing on its own.",
  }))

  checks.forEach((check) => addEvidence({
    type: "consistency_check",
    category: "consistency",
    label: check.check,
    value: check.status,
    source: "Cross-Artifact Consistency Engine",
    confidence: 0.85,
    risk_contribution: check.risk,
    details: check.details,
  }))

  const indicatorGroups = [
    ["email_address", "Email address", emails],
    ["url", "URL", urls],
    ["domain", "Domain", domains],
    ["ip_address", "IP address", ips],
  ]

  indicatorGroups.forEach(([type, label, values]) => {
    values.forEach((value) => addEvidence({
      type,
      category: "indicator",
      label,
      value,
      source: "Extracted from submitted email",
      confidence: 0.8,
      details: "Extracted indicator; reputation is not inferred without a threat-intelligence result.",
    }))
  })

  const counterfactual = counterfactualAnalysis(evidence)
  const risk = counterfactual.risk_breakdown

  const graph = {
    nodes: [
      { id: "email", type: "email", label: "Analyzed Email" },
      ...emails.map((email) => ({
        id: `email_${email}`,
        type: "sender",
        label: email,
      })),
      ...urls.map((url) => ({
        id: `url_${url}`,
        type: "url",
        label: url,
      })),
      ...ips.map((ip) => ({
        id: `ip_${ip}`,
        type: "ip",
        label: ip,
      })),
    ],
    edges: [
      ...emails.map((email) => ({
        source: "email",
        target: `email_${email}`,
        relation: "contains_sender",
      })),
      ...urls.map((url) => ({
        source: "email",
        target: `url_${url}`,
        relation: "contains_url",
      })),
      ...ips.map((ip) => ({
        source: "email",
        target: `ip_${ip}`,
        relation: "contains_ip",
      })),
    ],
    counterfactual_analysis: counterfactual,
  }

  return {
    message: "Email analyzed successfully in browser demo mode",
    analysis_mode: "browser_demo",
    parsed_data: parsedData,
    threat_analysis: {
      risk_score: risk.final_score,
      verdict: risk.verdict,
      suspicious_words: suspiciousWords,
      base_risk_score: risk.content_score,
      consistency_bonus: risk.consistency_score,
      authentication_bonus: risk.authentication_score,
    },
    ip_analysis: [],
    geolocation: [],
    consistency_analysis: consistency,
    authentication_analysis: authentication,
    evidence,
    counterfactual_analysis: counterfactual,
    graph,
  }
}
