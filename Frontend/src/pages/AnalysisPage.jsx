import { useState } from "react"
import ForensicGraph from "../components/ForensicGraph"
import { analyzeEmailLocally } from "../services/localAnalysis"


const CONFIGURED_API_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).trim().replace(/\/+$/, "")

const API_BASE_URL = CONFIGURED_API_URL || (
  import.meta.env.DEV
    ? "http://127.0.0.1:8000"
    : ""
)

function AnalysisPage() {
  const [emailText, setEmailText] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploadedFile, setUploadedFile] = useState("")

  // ==========================================
  // SAVE ANALYSIS TO LOCAL STORAGE
  // ==========================================

  const saveAnalysisHistory = (
    data,
    source,
    analyzedEmailText
  ) => {
    try {
      const savedHistory =
        localStorage.getItem("analysisHistory")

      const oldHistory = savedHistory
        ? JSON.parse(savedHistory)
        : []

      const newRecord = {
        id: Date.now(),

        timestamp: new Date().toISOString(),

        date: new Date().toLocaleString(),

        source,

        emailText: analyzedEmailText,

        riskScore:
          data.threat_analysis?.risk_score ?? 0,

        baseRiskScore:
          data.threat_analysis?.base_risk_score ?? 0,

        consistencyBonus:
          data.threat_analysis?.consistency_bonus ?? 0,

        verdict:
          data.threat_analysis?.verdict ?? "unknown",

        suspiciousWords:
          data.threat_analysis?.suspicious_words || [],

        emails:
          data.parsed_data?.emails || [],

        urls:
          data.parsed_data?.urls || [],

        ips:
          data.parsed_data?.ips || [],

        consistencyAnalysis:
          data.consistency_analysis || null,

        ipAnalysis:
          data.ip_analysis || [],

        geolocation:
          data.geolocation || [],

        graph:
          data.graph || null,

        fullResult: data,
      }

      const updatedHistory = [
        newRecord,
        ...oldHistory,
      ].slice(0, 50)

      localStorage.setItem(
        "analysisHistory",
        JSON.stringify(updatedHistory)
      )
    } catch (storageError) {
      console.error(
        "Failed to save analysis history:",
        storageError
      )
    }
  }

  // ==========================================
  // API REQUEST
  // ==========================================

  const runAnalysis = async (text) => {
    if (!API_BASE_URL) {
      return analyzeEmailLocally(text)
    }

    const response = await fetch(
      `${API_BASE_URL}/api/analysis/analyze`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email_text: text,
        }),
      }
    )

    if (!response.ok) {
      const errorData =
        await response.json().catch(() => null)

      throw new Error(
        errorData?.detail ||
          "Failed to analyze email."
      )
    }

    return await response.json()
  }

  // ==========================================
  // MANUAL ANALYSIS
  // ==========================================

  const analyzeEmail = async () => {
    if (!emailText.trim()) {
      setError("Please enter email content.")
      return
    }

    try {
      setLoading(true)
      setError("")
      setResult(null)

      const data =
        await runAnalysis(emailText)

      setResult(data)

      saveAnalysisHistory(
        data,
        "Manual Email Analysis",
        emailText
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // EML UPLOAD
  // ==========================================

  const uploadEmail = async (event) => {
    const file =
      event.target.files?.[0]

    if (!file) return

    if (
      !file.name
        .toLowerCase()
        .endsWith(".eml")
    ) {
      setError(
        "Please select a valid .eml file."
      )

      event.target.value = ""
      return
    }

    try {
      setLoading(true)
      setError("")
      setResult(null)

      const fileContent =
        await file.text()

      if (!fileContent.trim()) {
        throw new Error(
          "Uploaded email file is empty."
        )
      }

      setEmailText(fileContent)
      setUploadedFile(file.name)

      const data =
        await runAnalysis(fileContent)

      setResult(data)

      saveAnalysisHistory(
        data,
        file.name,
        fileContent
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      event.target.value = ""
    }
  }

  // ==========================================
  // CLEAR CURRENT ANALYSIS
  // ==========================================

  const clearAnalysis = () => {
    setEmailText("")
    setResult(null)
    setError("")
    setUploadedFile("")
  }

  // ==========================================
  // COLORS
  // ==========================================

  const getRiskColor = (score) => {
    if (score >= 60) {
      return "from-red-600 via-red-500 to-orange-400"
    }

    if (score >= 30) {
      return "from-yellow-500 via-amber-400 to-orange-400"
    }

    return "from-green-500 via-emerald-400 to-cyan-400"
  }

  const getVerdictStyle = (score) => {
    if (score >= 60) {
      return `
        bg-red-950/60
        text-red-300
        border-red-500/40
        shadow-[0_0_25px_rgba(239,68,68,0.15)]
      `
    }

    if (score >= 30) {
      return `
        bg-yellow-950/60
        text-yellow-300
        border-yellow-500/40
        shadow-[0_0_25px_rgba(234,179,8,0.12)]
      `
    }

    return `
      bg-green-950/60
      text-green-300
      border-green-500/40
      shadow-[0_0_25px_rgba(34,197,94,0.12)]
    `
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">

      {/* BACKGROUND GRID */}

      <div
        className="fixed inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(59,130,246,0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(59,130,246,0.035) 1px,
              transparent 1px
            )
          `,
          backgroundSize: "45px 45px",
        }}
      />

      {/* ANIMATED GLOWS */}

      <div
        className="
          fixed
          -top-40
          -left-40
          w-[600px]
          h-[600px]
          rounded-full
          bg-blue-600/10
          blur-[140px]
          animate-float-slow
          pointer-events-none
        "
      />

      <div
        className="
          fixed
          top-[35%]
          -right-52
          w-[600px]
          h-[600px]
          rounded-full
          bg-purple-600/10
          blur-[150px]
          animate-float-reverse
          pointer-events-none
        "
      />

      <div
        className="
          fixed
          bottom-[-250px]
          left-[35%]
          w-[500px]
          h-[500px]
          rounded-full
          bg-cyan-500/5
          blur-[130px]
          animate-pulse
          pointer-events-none
        "
      />

      {/* SCAN LINE */}

      <div
        className="
          fixed
          inset-x-0
          h-[1px]
          bg-gradient-to-r
          from-transparent
          via-blue-400/20
          to-transparent
          animate-scan
          pointer-events-none
          z-10
        "
      />

      {/* HEADER */}

      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-white/5
          bg-[#020617]/80
          backdrop-blur-xl
        "
      >

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div
              className="
                relative
                w-11
                h-11
                rounded-xl
                bg-blue-500/10
                border
                border-blue-500/30
                flex
                items-center
                justify-center
                shadow-[0_0_25px_rgba(59,130,246,0.15)]
              "
            >

              <div
                className="
                  absolute
                  inset-0
                  rounded-xl
                  border
                  border-blue-400/20
                  animate-ping-slow
                "
              />

              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-blue-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="
                    M12 3
                    L19 6
                    V11
                    C19 16
                    15.5 19.5
                    12 21
                    C8.5 19.5
                    5 16
                    5 11
                    V6
                    L12 3
                  "
                />

                <path
                  d="
                    M9 12
                    L11 14
                    L15 10
                  "
                />
              </svg>

            </div>

            <div>

              <h1 className="font-bold text-lg tracking-tight">
                THREAT LENS PROTOTYPE
              </h1>

              <p className="text-xs text-slate-500">
                Threat Intelligence Console
              </p>

            </div>

          </div>

          <div
            className="
              hidden
              sm:flex
              items-center
              gap-3
              border
              border-green-500/20
              bg-green-950/30
              px-4
              py-2
              rounded-full
            "
          >

            <div className="relative w-3 h-3">

              <span
                className="
                  absolute
                  inset-0
                  bg-green-400
                  rounded-full
                  animate-ping
                  opacity-40
                "
              />

              <span
                className="
                  absolute
                  inset-[2px]
                  bg-green-400
                  rounded-full
                "
              />

            </div>

            <span
              className="
                text-[11px]
                tracking-[0.16em]
                text-green-400
                font-semibold
              "
            >
              ANALYSIS NODE ONLINE
            </span>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="relative z-20 max-w-7xl mx-auto px-6 py-10">

        {/* HERO */}

        <section className="mb-10 animate-slide-up">

          <div
            className="
              inline-flex
              items-center
              gap-2
              border
              border-blue-500/20
              bg-blue-500/5
              rounded-full
              px-4
              py-2
              mb-5
            "
          >

            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />

            <span
              className="
                text-[11px]
                tracking-[0.2em]
                text-blue-300
                font-semibold
              "
            >
              THREAT ANALYSIS CONSOLE
            </span>

          </div>

          <h2
            className="
              text-4xl
              md:text-5xl
              font-bold
              tracking-tight
              max-w-3xl
            "
          >
            Analyze suspicious email.

            <span
              className="
                block
                mt-2
                bg-gradient-to-r
                from-blue-300
                via-cyan-300
                to-purple-300
                bg-clip-text
                text-transparent
              "
            >
              Understand every signal.
            </span>

          </h2>

          <p
            className="
              text-slate-400
              mt-5
              max-w-2xl
              leading-relaxed
            "
          >
            Extract indicators, inspect infrastructure,
            correlate suspicious artifacts and generate
            explainable forensic intelligence.
          </p>

        </section>

        {/* EMAIL INPUT */}

        <section
          className="
            relative
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-slate-900/60
            backdrop-blur-xl
            p-6
            shadow-2xl
            transition-all
            duration-500
            hover:border-blue-500/20
            hover:shadow-[0_0_50px_rgba(59,130,246,0.07)]
            animate-slide-up-delay
          "
        >

          <div
            className="
              absolute
              top-0
              left-[15%]
              right-[15%]
              h-[2px]
              bg-gradient-to-r
              from-transparent
              via-blue-400/80
              to-transparent
            "
          />

          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">

            <div>

              <p className="text-[10px] text-cyan-400 tracking-[0.2em] font-semibold">
                EMAIL INGEST
              </p>

              <h3 className="text-xl font-semibold mt-1">
                Analyze Email
              </h3>

              <p className="text-slate-500 text-sm mt-1">
                Paste raw email content or upload an .eml file.
              </p>

            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">

              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />

              Parser Ready

            </div>

          </div>

          {uploadedFile && (
            <div
              className="
                mb-4
                border
                border-purple-500/30
                bg-purple-950/30
                rounded-xl
                p-4
                animate-result
              "
            >

              <p className="text-xs text-purple-400">
                LOADED ARTIFACT
              </p>

              <p className="font-medium mt-1 break-all">
                {uploadedFile}
              </p>

            </div>
          )}

          <div className="relative">

            <textarea
              value={emailText}
              onChange={(event) => {
                setEmailText(event.target.value)
                setUploadedFile("")
              }}
              placeholder="Paste suspicious email content here..."
              className="
                w-full
                h-64
                resize-none
                rounded-2xl
                border
                border-slate-700
                bg-[#020617]/90
                p-5
                font-mono
                text-sm
                text-slate-300
                outline-none
                transition-all
                duration-300
                focus:border-blue-400/70
                focus:ring-1
                focus:ring-blue-400/30
                focus:shadow-[0_0_30px_rgba(59,130,246,0.08)]
              "
            />

            <div className="absolute left-2 top-2 w-5 h-5 border-l border-t border-blue-400/40 pointer-events-none" />

            <div className="absolute right-2 top-2 w-5 h-5 border-r border-t border-blue-400/40 pointer-events-none" />

            <div className="absolute left-2 bottom-2 w-5 h-5 border-l border-b border-blue-400/40 pointer-events-none" />

            <div className="absolute right-2 bottom-2 w-5 h-5 border-r border-b border-blue-400/40 pointer-events-none" />

          </div>

          <div className="flex flex-wrap gap-3 mt-5">

            <button
              onClick={analyzeEmail}
              disabled={loading}
              className="
                relative
                overflow-hidden
                group
                rounded-xl
                bg-gradient-to-r
                from-blue-600
                to-cyan-600
                px-6
                py-3
                font-semibold
                transition-all
                duration-300
                hover:-translate-y-[2px]
                hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
            >

              <span
                className="
                  absolute
                  inset-0
                  translate-x-[-120%]
                  bg-gradient-to-r
                  from-transparent
                  via-white/20
                  to-transparent
                  group-hover:translate-x-[120%]
                  transition-transform
                  duration-700
                "
              />

              <span className="relative flex items-center gap-2">

                {loading && (
                  <span
                    className="
                      w-4
                      h-4
                      border-2
                      border-white/30
                      border-t-white
                      rounded-full
                      animate-spin
                    "
                  />
                )}

                {loading
                  ? "Analyzing..."
                  : "Analyze Email"}

              </span>

            </button>

            <label
              className="
                cursor-pointer
                rounded-xl
                border
                border-purple-500/30
                bg-purple-500/10
                px-6
                py-3
                font-semibold
                text-purple-300
                transition-all
                duration-300
                hover:-translate-y-[2px]
                hover:bg-purple-500/15
                hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]
              "
            >

              Upload .EML

              <input
                type="file"
                accept=".eml"
                disabled={loading}
                className="hidden"
                onChange={uploadEmail}
              />

            </label>

            <button
              onClick={clearAnalysis}
              disabled={loading}
              className="
                rounded-xl
                border
                border-slate-700
                bg-slate-800/60
                px-6
                py-3
                font-semibold
                text-slate-300
                transition-all
                duration-300
                hover:bg-slate-700
                hover:border-slate-600
              "
            >
              Clear
            </button>

          </div>

          {error && (
            <div
              className="
                mt-5
                rounded-xl
                border
                border-red-500/30
                bg-red-950/40
                p-4
                text-red-300
                animate-result
              "
            >
              {error}
            </div>
          )}

        </section>

        {/* LOADING */}

        {loading && (
          <div
            className="
              mt-8
              relative
              overflow-hidden
              rounded-2xl
              border
              border-blue-500/20
              bg-blue-950/10
              p-5
              animate-result
            "
          >

            <div
              className="
                absolute
                top-0
                bottom-0
                w-32
                bg-gradient-to-r
                from-transparent
                via-blue-400/10
                to-transparent
                animate-loading-scan
              "
            />

            <div className="relative flex items-center gap-4">

              <div
                className="
                  w-10
                  h-10
                  border-2
                  border-blue-400/20
                  border-t-blue-400
                  rounded-full
                  animate-spin
                "
              />

              <div>

                <p className="font-semibold">
                  Analyzing threat artifacts
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Extracting indicators • Correlating infrastructure • Building graph
                </p>

              </div>

            </div>

          </div>
        )}

        {/* RESULTS */}

        {result && (
          <div className="mt-8 space-y-6 animate-result">

            <AnimatedCard accent="blue">

              <div className="flex flex-wrap justify-between gap-4 mb-6">

                <div>

                  <p className="text-[10px] tracking-[0.2em] text-blue-400 font-semibold">
                    THREAT ASSESSMENT
                  </p>

                  <h3 className="text-2xl font-bold mt-1">
                    Analysis Result
                  </h3>

                </div>

                <span
                  className={`
                    border
                    rounded-full
                    px-5
                    py-2
                    font-semibold
                    capitalize
                    animate-pulse-soft
                    ${getVerdictStyle(
                      result.threat_analysis.risk_score
                    )}
                  `}
                >
                  {result.threat_analysis.verdict}
                </span>

              </div>

              <div className="grid md:grid-cols-3 gap-4">

                <StatCard
                  label="Risk Score"
                  value={`${result.threat_analysis.risk_score}/100`}
                >

                  <div className="mt-5 h-3 bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className={`
                        h-full
                        rounded-full
                        bg-gradient-to-r
                        ${getRiskColor(
                          result.threat_analysis.risk_score
                        )}
                        animate-risk-bar
                      `}
                      style={{
                        "--risk-width":
                          `${result.threat_analysis.risk_score}%`,
                      }}
                    />

                  </div>

                </StatCard>

                <StatCard
                  label="URLs Detected"
                  value={
                    result.parsed_data.urls.length
                  }
                />

                <StatCard
                  label="IP Addresses"
                  value={
                    result.parsed_data.ips.length
                  }
                />

              </div>

              <div className="mt-6">

                <p className="font-semibold">
                  Suspicious Indicators
                </p>

                <div className="flex flex-wrap gap-2 mt-3">

                  {result.threat_analysis.suspicious_words.length > 0 ? (
                    result.threat_analysis.suspicious_words.map(
                      (word, index) => (
                        <span
                          key={index}
                          className="
                            rounded-lg
                            border
                            border-red-500/30
                            bg-red-950/40
                            px-3
                            py-1.5
                            text-sm
                            text-red-300
                          "
                        >
                          {word}
                        </span>
                      )
                    )
                  ) : (
                    <p className="text-slate-500">
                      No suspicious indicators detected.
                    </p>
                  )}

                </div>

              </div>

            </AnimatedCard>

            {result.consistency_analysis && (
              <AnimatedCard accent="purple">

                <div className="flex flex-wrap justify-between gap-4">

                  <div>

                    <p className="text-[10px] tracking-[0.2em] text-purple-400 font-semibold">
                      CROSS-ARTIFACT CONSISTENCY ENGINE
                    </p>

                    <h3 className="text-xl font-semibold mt-1">
                      Consistency Analysis
                    </h3>

                    <p className="text-slate-500 text-sm mt-2">
                      Correlating sender identity, Reply-To,
                      URL infrastructure and IP intelligence.
                    </p>

                  </div>

                  <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 px-5 py-3">

                    <p className="text-xs text-slate-500">
                      Consistency Risk
                    </p>

                    <p className="text-2xl font-bold text-purple-300">
                      +{result.consistency_analysis.risk_bonus}
                    </p>

                  </div>

                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-4">

                  <MiniDataCard
                    label="Sender"
                    value={
                      result.consistency_analysis.sender ||
                      "Not detected"
                    }
                  />

                  <MiniDataCard
                    label="Reply-To"
                    value={
                      result.consistency_analysis.reply_to ||
                      "Not detected"
                    }
                  />

                </div>

                <div className="mt-6 space-y-3">

                  {result.consistency_analysis.checks.length > 0 ? (
                    result.consistency_analysis.checks.map(
                      (check, index) => (
                        <div
                          key={index}
                          className="
                            rounded-xl
                            border
                            border-slate-800
                            bg-[#020617]/70
                            p-4
                          "
                        >

                          <div className="flex flex-wrap justify-between gap-3">

                            <p className="font-semibold">
                              {check.check}
                            </p>

                            <span
                              className={
                                check.status === "mismatch"
                                  ? "text-red-400 font-semibold"
                                  : "text-green-400 font-semibold"
                              }
                            >
                              {check.status}
                            </span>

                          </div>

                          <p className="text-sm text-slate-400 mt-2">
                            {check.details}
                          </p>

                          {check.risk > 0 && (
                            <p className="text-sm text-red-400 mt-2">
                              Risk contribution: +{check.risk}
                            </p>
                          )}

                        </div>
                      )
                    )
                  ) : (
                    <p className="text-slate-500">
                      No inconsistencies detected.
                    </p>
                  )}

                </div>

              </AnimatedCard>
            )}

            <div className="grid lg:grid-cols-2 gap-6">

              <AnimatedCard accent="cyan">

                <p className="text-lg font-semibold mb-4">
                  Detected Email Addresses
                </p>

                {result.parsed_data.emails.length > 0 ? (
                  result.parsed_data.emails.map(
                    (email, index) => (
                      <MiniDataCard
                        key={index}
                        label="Email Artifact"
                        value={email}
                      />
                    )
                  )
                ) : (
                  <p className="text-slate-500">
                    No email addresses detected.
                  </p>
                )}

              </AnimatedCard>

              <AnimatedCard accent="red">

                <p className="text-lg font-semibold mb-4">
                  Detected URLs
                </p>

                {result.parsed_data.urls.length > 0 ? (
                  result.parsed_data.urls.map(
                    (url, index) => (
                      <div
                        key={index}
                        className="
                          mb-3
                          rounded-xl
                          border
                          border-red-500/20
                          bg-red-950/20
                          p-4
                          text-red-300
                          break-all
                        "
                      >
                        {url}
                      </div>
                    )
                  )
                ) : (
                  <p className="text-slate-500">
                    No URLs detected.
                  </p>
                )}

              </AnimatedCard>

            </div>

            <AnimatedCard accent="yellow">

              <p className="text-[10px] tracking-[0.2em] text-yellow-400 font-semibold">
                NETWORK INTELLIGENCE
              </p>

              <h3 className="text-xl font-semibold mt-1 mb-5">
                IP Analysis
              </h3>

              {result.ip_analysis.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">

                  {result.ip_analysis.map(
                    (ip, index) => (
                      <div
                        key={index}
                        className="
                          rounded-xl
                          border
                          border-yellow-500/15
                          bg-[#020617]/70
                          p-5
                        "
                      >

                        <p className="text-xl font-bold">
                          {ip.ip}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">

                          <DataPoint
                            label="Version"
                            value={ip.version}
                          />

                          <DataPoint
                            label="Global"
                            value={
                              ip.is_global
                                ? "Yes"
                                : "No"
                            }
                          />

                          <DataPoint
                            label="Private"
                            value={
                              ip.is_private
                                ? "Yes"
                                : "No"
                            }
                          />

                          <DataPoint
                            label="Loopback"
                            value={
                              ip.is_loopback
                                ? "Yes"
                                : "No"
                            }
                          />

                        </div>

                      </div>
                    )
                  )}

                </div>
              ) : (
                <p className="text-slate-500">
                  No IP addresses detected.
                </p>
              )}

            </AnimatedCard>

            <AnimatedCard accent="green">

              <p className="text-[10px] tracking-[0.2em] text-green-400 font-semibold">
                INFRASTRUCTURE GEOLOCATION
              </p>

              <h3 className="text-xl font-semibold mt-1 mb-5">
                Geolocation Intelligence
              </h3>

              {result.geolocation.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">

                  {result.geolocation.map(
                    (geo, index) => (
                      <div
                        key={index}
                        className="
                          rounded-xl
                          border
                          border-green-500/15
                          bg-[#020617]/70
                          p-5
                        "
                      >

                        <p className="font-bold text-lg">
                          {geo.ip}
                        </p>

                        <div className="mt-4 space-y-3">

                          <DataPoint
                            label="Country"
                            value={
                              geo.location.country
                            }
                          />

                          <DataPoint
                            label="City"
                            value={
                              geo.location.city
                            }
                          />

                          <DataPoint
                            label="Organization"
                            value={
                              geo.location.organization
                            }
                          />

                        </div>

                      </div>
                    )
                  )}

                </div>
              ) : (
                <p className="text-slate-500">
                  No geolocation data available.
                </p>
              )}

            </AnimatedCard>

            <AnimatedCard accent="blue">

              <div className="mb-6">

                <p className="text-[10px] tracking-[0.2em] text-blue-400 font-semibold">
                  FORENSIC RELATIONSHIP VIEW
                </p>

                <h3 className="text-xl font-semibold mt-1">
                  Relationship Graph
                </h3>

                <p className="text-slate-500 mt-2">
                  Visual relationships between email artifacts,
                  infrastructure and geolocation intelligence.
                </p>

              </div>

              <div className="rounded-2xl border border-blue-500/10 bg-[#020617]/50 p-5">

                <ForensicGraph
                  graph={result.graph}
                />

              </div>

            </AnimatedCard>

          </div>
        )}

      </main>

      {/* ANIMATIONS */}

      <style>{`

        @keyframes floatSlow {
          0%, 100% {
            transform: translate(0px, 0px);
          }

          50% {
            transform: translate(80px, 50px);
          }
        }

        @keyframes floatReverse {
          0%, 100% {
            transform: translate(0px, 0px);
          }

          50% {
            transform: translate(-70px, -40px);
          }
        }

        @keyframes scan {
          0% {
            top: -5%;
          }

          100% {
            top: 105%;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(25px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes resultEnter {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.99);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes riskBar {
          from {
            width: 0%;
          }

          to {
            width: var(--risk-width);
          }
        }

        @keyframes loadingScan {
          from {
            left: -150px;
          }

          to {
            left: calc(100% + 150px);
          }
        }

        @keyframes pingSlow {
          0% {
            transform: scale(1);
            opacity: .5;
          }

          70% {
            transform: scale(1.5);
            opacity: 0;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes pulseSoft {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.025);
          }
        }

        .animate-float-slow {
          animation: floatSlow 10s ease-in-out infinite;
        }

        .animate-float-reverse {
          animation: floatReverse 12s ease-in-out infinite;
        }

        .animate-scan {
          animation: scan 8s linear infinite;
        }

        .animate-slide-up {
          animation: slideUp .65s ease-out both;
        }

        .animate-slide-up-delay {
          animation: slideUp .65s ease-out .12s both;
        }

        .animate-result {
          animation:
            resultEnter
            .55s
            cubic-bezier(.16, 1, .3, 1)
            both;
        }

        .animate-risk-bar {
          animation:
            riskBar
            1.1s
            ease-out
            forwards;
        }

        .animate-loading-scan {
          animation:
            loadingScan
            1.8s
            linear
            infinite;
        }

        .animate-ping-slow {
          animation:
            pingSlow
            2.5s
            ease-out
            infinite;
        }

        .animate-pulse-soft {
          animation:
            pulseSoft
            2.2s
            ease-in-out
            infinite;
        }

      `}</style>

    </div>
  )
}


// ==========================================
// COMPONENTS
// ==========================================

function AnimatedCard({
  children,
  accent = "blue",
}) {
  const accents = {
    blue:
      "hover:border-blue-500/25",

    purple:
      "hover:border-purple-500/25",

    cyan:
      "hover:border-cyan-500/25",

    red:
      "hover:border-red-500/25",

    yellow:
      "hover:border-yellow-500/25",

    green:
      "hover:border-green-500/25",
  }

  return (
    <section
      className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        border-white/10
        bg-slate-900/60
        backdrop-blur-xl
        p-6
        shadow-xl
        transition-all
        duration-500
        hover:-translate-y-[2px]
        ${accents[accent]}
      `}
    >

      <div
        className="
          absolute
          top-0
          left-[20%]
          right-[20%]
          h-[1px]
          bg-gradient-to-r
          from-transparent
          via-white/20
          to-transparent
        "
      />

      {children}

    </section>
  )
}


function StatCard({
  label,
  value,
  children,
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-[#020617]/70
        p-5
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-blue-500/20
      "
    >

      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

      {children}

    </div>
  )
}


function MiniDataCard({
  label,
  value,
}) {
  return (
    <div
      className="
        mb-3
        rounded-xl
        border
        border-slate-800
        bg-[#020617]/70
        p-4
      "
    >

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all">
        {value}
      </p>

    </div>
  )
}


function DataPoint({
  label,
  value,
}) {
  return (
    <div>

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-slate-300 break-all">
        {value}
      </p>

    </div>
  )
}


export default AnalysisPage
