const DASHBOARD_URL = "http://localhost:5173/"
const MINIMUM_BATCH_SIZE = 5
const MAXIMUM_BATCH_SIZE = 25

const elements = {
  nodeStatus: document.getElementById("nodeStatus"),
  refreshButton: document.getElementById("refreshButton"),
  selectedCount: document.getElementById("selectedCount"),
  selectionStatus: document.getElementById("selectionStatus"),
  selectionPreview: document.getElementById("selectionPreview"),
  errorBox: document.getElementById("errorBox"),
  batchAnalyzeButton: document.getElementById("batchAnalyzeButton"),
  batchButtonText: document.getElementById("batchButtonText"),
  singleAnalyzeButton: document.getElementById("singleAnalyzeButton"),
  spinner: document.getElementById("spinner"),
  reportCard: document.getElementById("reportCard"),
  reportMeta: document.getElementById("reportMeta"),
  totalCount: document.getElementById("totalCount"),
  highCount: document.getElementById("highCount"),
  suspiciousCount: document.getElementById("suspiciousCount"),
  lowCount: document.getElementById("lowCount"),
  averageScore: document.getElementById("averageScore"),
  reportList: document.getElementById("reportList"),
  downloadButton: document.getElementById("downloadButton"),
  dashboardButton: document.getElementById("dashboardButton"),
}

let selectedEmails = []
let lastReport = null
let loading = false


function showError(message) {
  elements.errorBox.textContent = message
  elements.errorBox.classList.remove("hidden")
}


function clearError() {
  elements.errorBox.textContent = ""
  elements.errorBox.classList.add("hidden")
}


function setLoading(value, message = "Analyzing Batch...") {
  loading = value
  elements.nodeStatus.textContent = value ? "SCANNING" : "READY"
  elements.spinner.classList.toggle("hidden", !value)
  elements.batchButtonText.textContent = value
    ? message
    : "Analyze Selected Emails"
  elements.refreshButton.disabled = value
  elements.singleAnalyzeButton.disabled = value
  updateBatchButton()
}


function updateBatchButton() {
  const validCount = selectedEmails.length >= MINIMUM_BATCH_SIZE
    && selectedEmails.length <= MAXIMUM_BATCH_SIZE

  elements.batchAnalyzeButton.disabled = loading || !validCount
}


async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!tabs.length || !tabs[0].id) {
    throw new Error("Unable to access the active browser tab.")
  }

  return tabs[0]
}


async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    })
  } catch {
    throw new Error(
      "This page cannot be scanned. Open Gmail and try again."
    )
  }
}


function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!response?.ok) {
        reject(new Error(response?.error || "Email extraction failed."))
        return
      }

      resolve(response)
    })
  })
}


function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!response?.ok) {
        reject(new Error(response?.error || "Analysis failed."))
        return
      }

      resolve(response.result)
    })
  })
}


function renderSelection(selection) {
  selectedEmails = selection.emails || []
  elements.selectedCount.textContent = String(selection.selectedCount || 0)
  elements.selectionPreview.replaceChildren()

  selectedEmails.slice(0, 6).forEach((email, index) => {
    const chip = document.createElement("span")
    chip.className = "preview-chip"
    chip.textContent = `${index + 1}. ${email.subject}`
    chip.title = email.subject
    elements.selectionPreview.appendChild(chip)
  })

  if (selectedEmails.length > 6) {
    const moreChip = document.createElement("span")
    moreChip.className = "preview-chip"
    moreChip.textContent = `+${selectedEmails.length - 6} more`
    elements.selectionPreview.appendChild(moreChip)
  }

  if (selection.selectedCount > MAXIMUM_BATCH_SIZE) {
    elements.selectionStatus.textContent = "First 25 will be analyzed"
    elements.selectionStatus.className = "selection-badge ready"
  } else if (selectedEmails.length >= MINIMUM_BATCH_SIZE) {
    elements.selectionStatus.textContent = "Ready for batch analysis"
    elements.selectionStatus.className = "selection-badge ready"
  } else {
    const remaining = MINIMUM_BATCH_SIZE - selectedEmails.length
    elements.selectionStatus.textContent = `${remaining} more required`
    elements.selectionStatus.className = "selection-badge waiting"
  }

  updateBatchButton()
}


async function refreshSelection({ showErrors = true } = {}) {
  try {
    clearError()
    const tab = await getActiveTab()
    await ensureContentScript(tab.id)
    const response = await sendTabMessage(tab.id, {
      type: "EXTRACT_SELECTED_EMAILS",
    })
    renderSelection(response.selection)
    return response.selection
  } catch (error) {
    selectedEmails = []
    renderSelection({ selectedCount: 0, emails: [] })

    if (showErrors) {
      showError(error.message)
    }

    return null
  }
}


function riskClass(score) {
  if (score >= 60) return "high-risk"
  if (score >= 30) return "suspicious-risk"
  return "low-risk"
}


function addTextElement(parent, tagName, className, text) {
  const element = document.createElement(tagName)
  element.className = className
  element.textContent = text
  parent.appendChild(element)
  return element
}


function renderEmailResult(item) {
  const card = document.createElement("article")

  if (item.status !== "analyzed" || !item.analysis) {
    card.className = "email-result failed-risk"
    addTextElement(
      card,
      "p",
      "result-position",
      `EMAIL ${item.position} • FAILED`
    )
    addTextElement(card, "p", "result-subject", item.subject)
    addTextElement(
      card,
      "p",
      "result-detail",
      item.error || "Analysis failed."
    )
    return card
  }

  const analysis = item.analysis
  const threat = analysis.threat_analysis || {}
  const parsed = analysis.parsed_data || {}
  const dependency = analysis.counterfactual_analysis
    ?.strongest_dependency

  card.className = `email-result ${riskClass(threat.risk_score || 0)}`

  const topline = document.createElement("div")
  topline.className = "result-topline"

  const description = document.createElement("div")
  addTextElement(
    description,
    "p",
    "result-position",
    `EMAIL ${item.position} • ${(threat.verdict || "unknown").toUpperCase()}`
  )
  addTextElement(
    description,
    "p",
    "result-subject",
    item.subject || `Email ${item.position}`
  )
  addTextElement(
    description,
    "p",
    "result-sender",
    item.sender || "Sender not detected"
  )

  const scoreBox = document.createElement("div")
  scoreBox.className = "result-score"
  addTextElement(
    scoreBox,
    "strong",
    "",
    String(threat.risk_score || 0)
  )
  addTextElement(scoreBox, "span", "", "risk / 100")

  topline.append(description, scoreBox)
  card.appendChild(topline)

  addTextElement(
    card,
    "p",
    "result-detail",
    `${(parsed.urls || []).length} URL(s) • ${(parsed.ips || []).length} IP(s) • +${threat.consistency_bonus || 0} consistency risk`
  )

  if (dependency) {
    addTextElement(
      card,
      "p",
      "result-dependency",
      `Strongest dependency: ${dependency.removed_evidence} (${dependency.score_impact} point impact)`
    )
  }

  return card
}


function renderReport(report) {
  lastReport = report
  const summary = report.summary || {}
  const distribution = summary.risk_distribution || {}

  elements.reportMeta.textContent = `${report.report_id} • ${new Date(
    report.generated_at
  ).toLocaleString()}`
  elements.totalCount.textContent = String(summary.total_emails || 0)
  elements.highCount.textContent = String(distribution.high_risk || 0)
  elements.suspiciousCount.textContent = String(distribution.suspicious || 0)
  elements.lowCount.textContent = String(distribution.low_risk || 0)
  elements.averageScore.textContent = String(summary.average_risk_score || 0)
  elements.reportList.replaceChildren()

  ;(report.results || []).forEach((item) => {
    elements.reportList.appendChild(renderEmailResult(item))
  })

  elements.reportCard.classList.remove("hidden")
}


async function analyzeSelectedEmails() {
  try {
    clearError()
    setLoading(true)
    const selection = await refreshSelection({ showErrors: false })

    if (!selection) {
      throw new Error("Unable to read the Gmail selection.")
    }

    if (selectedEmails.length < MINIMUM_BATCH_SIZE) {
      throw new Error("Select at least 5 Gmail emails before batch analysis.")
    }

    const report = await sendRuntimeMessage({
      type: "ANALYZE_EMAIL_BATCH",
      emails: selectedEmails,
    })

    renderReport(report)
  } catch (error) {
    showError(error.message)
  } finally {
    setLoading(false)
  }
}


async function analyzeOpenEmail() {
  try {
    clearError()
    setLoading(true, "Analyzing Email...")
    const tab = await getActiveTab()
    await ensureContentScript(tab.id)
    const extraction = await sendTabMessage(tab.id, {
      type: "EXTRACT_CURRENT_EMAIL",
    })
    const analysis = await sendRuntimeMessage({
      type: "ANALYZE_EMAIL",
      emailText: extraction.email.rawText,
    })
    const score = analysis.threat_analysis?.risk_score || 0
    const verdict = analysis.threat_analysis?.verdict || "low risk"

    renderReport({
      report_id: `TL-SINGLE-${Date.now()}`,
      report_title: "Threat Lens Single-Email Report",
      generated_at: new Date().toISOString(),
      summary: {
        total_emails: 1,
        successful_analyses: 1,
        failed_analyses: 0,
        average_risk_score: score,
        maximum_risk_score: score,
        risk_distribution: {
          high_risk: verdict === "high risk" ? 1 : 0,
          suspicious: verdict === "suspicious" ? 1 : 0,
          low_risk: verdict === "low risk" ? 1 : 0,
        },
      },
      results: [{
        position: 1,
        email_id: extraction.email.id,
        source: extraction.email.source,
        sender: extraction.email.sender,
        subject: extraction.email.subject,
        status: "analyzed",
        error: null,
        analysis,
      }],
    })
  } catch (error) {
    showError(error.message)
  } finally {
    setLoading(false)
  }
}


function downloadReport() {
  if (!lastReport) {
    showError("No report is available to export.")
    return
  }

  const blob = new Blob(
    [JSON.stringify(lastReport, null, 2)],
    { type: "application/json" }
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${lastReport.report_id || "threat-lens-report"}.json`
  link.click()
  URL.revokeObjectURL(url)
}


elements.refreshButton.addEventListener("click", () => {
  refreshSelection()
})

elements.batchAnalyzeButton.addEventListener(
  "click",
  analyzeSelectedEmails
)

elements.singleAnalyzeButton.addEventListener(
  "click",
  analyzeOpenEmail
)

elements.downloadButton.addEventListener("click", downloadReport)

elements.dashboardButton.addEventListener("click", () => {
  chrome.tabs.create({ url: DASHBOARD_URL })
})


async function initializePopup() {
  await refreshSelection({ showErrors: false })

  const stored = await chrome.storage.local.get(["lastBatchAnalysis"])
  const report = stored.lastBatchAnalysis?.result

  if (report) {
    renderReport(report)
  }
}


initializePopup()
