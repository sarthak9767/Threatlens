import { useState } from "react"


function loadAnalysisHistory() {
  try {
    const saved =
      localStorage.getItem("analysisHistory")

    return saved
      ? JSON.parse(saved)
      : []
  } catch (error) {
    console.error(
      "Failed to load history:",
      error
    )

    return []
  }
}

function HistoryPage({ onBack }) {
  const [history, setHistory] = useState(loadAnalysisHistory)
  const [selectedRecord, setSelectedRecord] = useState(null)

  // ==========================================
  // DELETE ONE
  // ==========================================

  const deleteRecord = (id) => {
    const updatedHistory =
      history.filter(
        (item) =>
          item.id !== id
      )

    setHistory(updatedHistory)

    localStorage.setItem(
      "analysisHistory",
      JSON.stringify(updatedHistory)
    )

    if (
      selectedRecord?.id === id
    ) {
      setSelectedRecord(null)
    }
  }

  // ==========================================
  // CLEAR ALL
  // ==========================================

  const clearHistory = () => {
    localStorage.removeItem(
      "analysisHistory"
    )

    setHistory([])
    setSelectedRecord(null)
  }

  // ==========================================
  // RISK STYLE
  // ==========================================

  const getRiskStyle = (score) => {
    if (score >= 60) {
      return `
        border-red-500/30
        bg-red-950/40
        text-red-300
      `
    }

    if (score >= 30) {
      return `
        border-yellow-500/30
        bg-yellow-950/40
        text-yellow-300
      `
    }

    return `
      border-green-500/30
      bg-green-950/40
      text-green-300
    `
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">

      {/* BACKGROUND */}

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

      <div
        className="
          fixed
          -top-48
          -left-48
          w-[600px]
          h-[600px]
          rounded-full
          bg-blue-600/10
          blur-[150px]
          pointer-events-none
        "
      />

      <div
        className="
          fixed
          bottom-[-250px]
          right-[-100px]
          w-[600px]
          h-[600px]
          rounded-full
          bg-purple-600/10
          blur-[160px]
          pointer-events-none
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

          <div>

            <p className="text-xs text-blue-400 tracking-[0.2em] font-semibold">
              INVESTIGATION DATABASE
            </p>

            <h1 className="font-bold text-xl mt-1">
              Analysis History
            </h1>

          </div>

          <button
            onClick={onBack}
            className="
              border
              border-blue-500/30
              bg-blue-500/10
              hover:bg-blue-500/20
              text-blue-300
              px-5
              py-2.5
              rounded-xl
              transition
            "
          >
            ← Analysis Console
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* TITLE */}

        <div className="flex flex-wrap justify-between items-end gap-6 mb-8">

          <div>

            <h2 className="text-4xl font-bold">
              Investigation Records
            </h2>

            <p className="text-slate-500 mt-3">
              Previous email analysis results saved in this browser.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <div
              className="
                border
                border-slate-800
                bg-slate-900/60
                px-5
                py-3
                rounded-xl
              "
            >

              <p className="text-xs text-slate-500">
                Saved Records
              </p>

              <p className="text-xl font-bold">
                {history.length}
              </p>

            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="
                  border
                  border-red-500/20
                  bg-red-950/30
                  hover:bg-red-950/60
                  text-red-300
                  px-5
                  py-3
                  rounded-xl
                  transition
                "
              >
                Clear History
              </button>
            )}

          </div>

        </div>

        {/* EMPTY */}

        {history.length === 0 && (
          <div
            className="
              border
              border-white/10
              bg-slate-900/50
              backdrop-blur-xl
              rounded-3xl
              p-14
              text-center
            "
          >

            <div
              className="
                w-16
                h-16
                rounded-2xl
                bg-blue-500/10
                border
                border-blue-500/20
                flex
                items-center
                justify-center
                mx-auto
                text-2xl
              "
            >
              ◈
            </div>

            <h3 className="text-xl font-semibold mt-5">
              No investigation records
            </h3>

            <p className="text-slate-500 mt-2">
              Analyze an email and the result will automatically appear here.
            </p>

          </div>
        )}

        {/* HISTORY */}

        {history.length > 0 && (
          <div className="space-y-4">

            {history.map((item) => (

              <div
                key={item.id}
                className="
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/10
                  bg-slate-900/60
                  backdrop-blur-xl
                  p-6
                  transition-all
                  duration-300
                  hover:border-blue-500/25
                  hover:-translate-y-[2px]
                  hover:shadow-[0_0_30px_rgba(59,130,246,0.05)]
                "
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
                    via-blue-400/30
                    to-transparent
                  "
                />

                <div className="flex flex-wrap justify-between gap-5">

                  <div>

                    <p className="text-xs text-slate-500">
                      {item.date}
                    </p>

                    <h3 className="text-lg font-semibold mt-1 break-all">
                      {item.source}
                    </h3>

                  </div>

                  <div className="flex flex-wrap items-center gap-3">

                    <span
                      className={`
                        border
                        px-4
                        py-2
                        rounded-full
                        font-semibold
                        capitalize
                        ${getRiskStyle(
                          item.riskScore
                        )}
                      `}
                    >
                      {item.verdict}
                    </span>

                    <button
                      onClick={() =>
                        setSelectedRecord(
                          selectedRecord?.id === item.id
                            ? null
                            : item
                        )
                      }
                      className="
                        border
                        border-blue-500/20
                        bg-blue-500/10
                        hover:bg-blue-500/20
                        text-blue-300
                        px-4
                        py-2
                        rounded-xl
                        transition
                      "
                    >
                      {selectedRecord?.id === item.id
                        ? "Close"
                        : "View"}
                    </button>

                    <button
                      onClick={() =>
                        deleteRecord(item.id)
                      }
                      className="
                        border
                        border-red-500/20
                        bg-red-950/20
                        hover:bg-red-950/50
                        text-red-400
                        px-4
                        py-2
                        rounded-xl
                        transition
                      "
                    >
                      Delete
                    </button>

                  </div>

                </div>

                {/* STATS */}

                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">

                  <HistoryStat
                    label="Risk Score"
                    value={`${item.riskScore}/100`}
                  />

                  <HistoryStat
                    label="Consistency"
                    value={`+${item.consistencyBonus || 0}`}
                  />

                  <HistoryStat
                    label="Emails"
                    value={item.emails?.length || 0}
                  />

                  <HistoryStat
                    label="URLs"
                    value={item.urls?.length || 0}
                  />

                  <HistoryStat
                    label="IPs"
                    value={item.ips?.length || 0}
                  />

                </div>

                {/* INDICATORS */}

                {item.suspiciousWords?.length > 0 && (
                  <div className="mt-5">

                    <p className="text-xs text-slate-500">
                      SUSPICIOUS INDICATORS
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">

                      {item.suspiciousWords.map(
                        (word, index) => (
                          <span
                            key={index}
                            className="
                              border
                              border-red-500/20
                              bg-red-950/30
                              text-red-300
                              px-3
                              py-1
                              rounded-lg
                              text-sm
                            "
                          >
                            {word}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* EXPANDED DETAILS */}

                {selectedRecord?.id === item.id && (
                  <div
                    className="
                      mt-6
                      pt-6
                      border-t
                      border-slate-800
                      space-y-5
                    "
                  >

                    <div>

                      <p className="text-xs text-blue-400 tracking-widest">
                        ORIGINAL EMAIL CONTENT
                      </p>

                      <pre
                        className="
                          mt-3
                          max-h-72
                          overflow-auto
                          whitespace-pre-wrap
                          break-words
                          rounded-xl
                          border
                          border-slate-800
                          bg-[#020617]
                          p-4
                          text-sm
                          text-slate-400
                        "
                      >
                        {item.emailText ||
                          "Email content was not saved."}
                      </pre>

                    </div>

                    <div className="grid md:grid-cols-3 gap-4">

                      <ArtifactList
                        title="Emails"
                        items={
                          item.emails || []
                        }
                      />

                      <ArtifactList
                        title="URLs"
                        items={
                          item.urls || []
                        }
                      />

                      <ArtifactList
                        title="IP Addresses"
                        items={
                          item.ips || []
                        }
                      />

                    </div>

                    {item.consistencyAnalysis && (
                      <div
                        className="
                          rounded-xl
                          border
                          border-purple-500/20
                          bg-purple-950/20
                          p-5
                        "
                      >

                        <p className="text-xs text-purple-400 tracking-widest">
                          CROSS-ARTIFACT RESULT
                        </p>

                        <p className="mt-3 capitalize font-semibold">
                          {
                            item.consistencyAnalysis
                              .verdict
                          }
                        </p>

                        <p className="text-slate-400 text-sm mt-1">
                          Consistency Risk: +
                          {
                            item.consistencyAnalysis
                              .risk_bonus
                          }
                        </p>

                      </div>
                    )}

                  </div>
                )}

              </div>

            ))}

          </div>
        )}

      </main>

    </div>
  )
}


// ==========================================
// COMPONENTS
// ==========================================

function HistoryStat({
  label,
  value,
}) {
  return (
    <div
      className="
        border
        border-slate-800
        bg-[#020617]/70
        rounded-xl
        p-4
      "
    >

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="text-xl font-bold mt-1">
        {value}
      </p>

    </div>
  )
}


function ArtifactList({
  title,
  items,
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-[#020617]/70
        p-4
      "
    >

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <div className="mt-3 space-y-2">

        {items.length > 0 ? (
          items.map(
            (item, index) => (
              <p
                key={index}
                className="
                  text-sm
                  text-slate-300
                  break-all
                "
              >
                {item}
              </p>
            )
          )
        ) : (
          <p className="text-sm text-slate-600">
            None detected
          </p>
        )}

      </div>

    </div>
  )
}


export default HistoryPage
