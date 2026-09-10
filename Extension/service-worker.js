const DEFAULT_BACKEND = "http://127.0.0.1:8000"


chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["backendUrl"])

  if (!stored.backendUrl) {
    await chrome.storage.local.set({
      backendUrl: DEFAULT_BACKEND,
    })
  }
})


async function getBackendUrl() {
  const stored = await chrome.storage.local.get(["backendUrl"])

  return (
    stored.backendUrl || DEFAULT_BACKEND
  ).replace(/\/+$/, "")
}


async function requestAnalysis(path, payload) {
  const backendUrl = await getBackendUrl()
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = "Backend analysis failed."

    try {
      const errorData = await response.json()

      if (errorData?.detail) {
        message = typeof errorData.detail === "string"
          ? errorData.detail
          : JSON.stringify(errorData.detail)
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message)
  }

  return response.json()
}


async function analyzeSingleEmail(emailText) {
  const result = await requestAnalysis(
    "/api/analysis/analyze",
    { email_text: emailText }
  )

  await chrome.storage.local.set({
    lastExtensionAnalysis: {
      savedAt: new Date().toISOString(),
      result,
    },
  })

  return result
}


async function analyzeEmailBatch(emails) {
  const result = await requestAnalysis(
    "/api/analysis/analyze-batch",
    {
      emails: emails.map((email) => ({
        id: email.id,
        source: email.source,
        sender: email.sender,
        subject: email.subject,
        email_text: email.rawText,
      })),
    }
  )

  await chrome.storage.local.set({
    lastBatchAnalysis: {
      savedAt: new Date().toISOString(),
      result,
    },
  })

  return result
}


chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    let task = null

    if (message?.type === "ANALYZE_EMAIL") {
      task = analyzeSingleEmail(message.emailText)
    }

    if (message?.type === "ANALYZE_EMAIL_BATCH") {
      task = analyzeEmailBatch(message.emails || [])
    }

    if (!task) {
      return false
    }

    task
      .then((result) => {
        sendResponse({
          ok: true,
          result,
        })
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error:
            error?.message ||
            "Unable to connect to the Threat Lens backend.",
        })
      })

    return true
  }
)
