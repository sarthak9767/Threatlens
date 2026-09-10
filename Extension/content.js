(() => {
  if (globalThis.__THREAT_LENS_EXTENSION_READY__) {
    return
  }

  globalThis.__THREAT_LENS_EXTENSION_READY__ = true

  const MINIMUM_BATCH_SIZE = 5
  const MAXIMUM_BATCH_SIZE = 25

  const cleanText = (value) => {
    return (value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }

  const isVisible = (element) => {
    if (!element) {
      return false
    }

    const style = window.getComputedStyle(element)

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    )
  }

  const findLastVisible = (selectors) => {
    for (const selector of selectors) {
      const elements = Array.from(
        document.querySelectorAll(selector)
      ).filter(isVisible)

      if (elements.length > 0) {
        return elements[elements.length - 1]
      }
    }

    return null
  }

  const createRawEmail = ({
    senderEmail,
    senderName,
    subject,
    body,
    date,
  }) => {
    let fromLine = ""

    if (senderEmail && senderName && senderName !== senderEmail) {
      fromLine = `From: ${senderName} <${senderEmail}>`
    } else if (senderEmail || senderName) {
      fromLine = `From: ${senderEmail || senderName}`
    }

    return [
      fromLine,
      subject ? `Subject: ${subject}` : "",
      date ? `Date: ${date}` : "",
      "",
      body,
    ]
      .filter((item) => item !== null && item !== undefined)
      .join("\n")
      .trim()
  }

  const extractOpenGmailEmail = () => {
    const subjectElement = findLastVisible(["h2.hP"])
    const senderElement = findLastVisible([
      ".gD[email]",
      "span[email]",
    ])
    const bodyElement = findLastVisible([
      ".a3s.aiL",
      ".a3s",
    ])
    const dateElement = findLastVisible([
      ".g3[title]",
      ".gH .g3",
    ])

    const subject = cleanText(subjectElement?.innerText)
    const senderEmail = cleanText(
      senderElement?.getAttribute("email")
    )
    const senderName = cleanText(
      senderElement?.getAttribute("name") ||
        senderElement?.innerText
    )
    const body = cleanText(bodyElement?.innerText)
    const date = cleanText(
      dateElement?.getAttribute("title") ||
        dateElement?.innerText
    )

    if (!subject && !senderEmail && !body) {
      throw new Error(
        "No open Gmail email detected. Open an email first."
      )
    }

    return {
      id: `open-${Date.now()}`,
      source: "gmail-open-email",
      sender: senderEmail || senderName || "Not detected",
      subject: subject || "No subject detected",
      body,
      date,
      rawText: createRawEmail({
        senderEmail,
        senderName,
        subject,
        body,
        date,
      }),
    }
  }

  const isSelectedGmailRow = (row) => {
    const checkbox = row.querySelector(
      '[role="checkbox"]'
    )

    return (
      checkbox?.getAttribute("aria-checked") === "true" ||
      checkbox?.classList.contains("T-Jo-Jp") ||
      row.getAttribute("aria-selected") === "true"
    )
  }

  const extractGmailRow = (row, position) => {
    const senderElement = row.querySelector(
      ".yW span[email], span[email], .yW span"
    )
    const subjectElement = row.querySelector(
      ".bog, .bqe"
    )
    const snippetElement = row.querySelector(
      ".y2"
    )
    const dateElement = row.querySelector(
      ".xW span[title], .xW span"
    )

    const senderEmail = cleanText(
      senderElement?.getAttribute("email")
    )
    const senderName = cleanText(
      senderElement?.getAttribute("name") ||
        senderElement?.innerText
    )
    const subject = cleanText(subjectElement?.innerText)
    const body = cleanText(snippetElement?.innerText)
      .replace(/^[-–—]\s*/, "")
    const date = cleanText(
      dateElement?.getAttribute("title") ||
        dateElement?.innerText
    )
    const threadId =
      row.getAttribute("data-legacy-thread-id") ||
      row.getAttribute("data-thread-id") ||
      row.id ||
      `selected-${position + 1}`

    return {
      id: threadId,
      source: "gmail-selected-row",
      sender: senderEmail || senderName || "Not detected",
      subject: subject || `Selected email ${position + 1}`,
      body,
      date,
      rawText: createRawEmail({
        senderEmail,
        senderName,
        subject,
        body,
        date,
      }),
    }
  }

  const extractSelectedGmailEmails = () => {
    if (window.location.hostname !== "mail.google.com") {
      throw new Error(
        "Batch selection currently works on the Gmail inbox."
      )
    }

    const visibleRows = Array.from(
      document.querySelectorAll("tr.zA")
    ).filter(isVisible)

    const selectedRows = visibleRows.filter(
      isSelectedGmailRow
    )

    const limitedRows = selectedRows.slice(
      0,
      MAXIMUM_BATCH_SIZE
    )

    return {
      source: "gmail-selection",
      selectedCount: selectedRows.length,
      minimumRequired: MINIMUM_BATCH_SIZE,
      maximumAllowed: MAXIMUM_BATCH_SIZE,
      truncated: selectedRows.length > MAXIMUM_BATCH_SIZE,
      emails: limitedRows.map(extractGmailRow),
    }
  }

  const extractSelectedText = () => {
    const selectedText = cleanText(
      window.getSelection()?.toString()
    )

    if (selectedText.length < 20) {
      throw new Error(
        "Select the email text first, or open an email in Gmail."
      )
    }

    return {
      id: `text-${Date.now()}`,
      source: "selected-text",
      sender: "Not detected",
      subject: document.title || "Selected Email",
      body: selectedText,
      date: "",
      rawText: selectedText,
    }
  }

  const extractCurrentEmail = () => {
    if (window.location.hostname === "mail.google.com") {
      return extractOpenGmailEmail()
    }

    return extractSelectedText()
  }

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      try {
        if (message?.type === "EXTRACT_SELECTED_EMAILS") {
          sendResponse({
            ok: true,
            selection: extractSelectedGmailEmails(),
          })
          return false
        }

        if (message?.type === "EXTRACT_CURRENT_EMAIL") {
          sendResponse({
            ok: true,
            email: extractCurrentEmail(),
          })
          return false
        }

        return false
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "Unable to extract email data.",
        })
        return false
      }
    }
  )
})()
