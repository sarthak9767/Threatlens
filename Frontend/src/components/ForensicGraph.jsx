function CounterfactualPanel({ analysis }) {
  if (!analysis) {
    return null
  }

  const strongest =
    analysis.strongest_dependency

  const visibleTests = (
    analysis.tests || []
  ).slice(0, 5)

  const breakdown =
    analysis.risk_breakdown || {}

  const impactStyle = (level) => {
    if (level === "high") {
      return "border-red-500/30 bg-red-950/30 text-red-200"
    }

    if (level === "medium") {
      return "border-yellow-500/30 bg-yellow-950/30 text-yellow-200"
    }

    return "border-blue-500/20 bg-blue-950/20 text-blue-200"
  }

  return (
    <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            What-if evidence testing
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Counterfactual Dependency Analysis
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {analysis.summary}
          </p>
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-slate-950/70 px-5 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Evidence robustness
          </p>

          <p className="mt-1 text-lg font-bold capitalize text-cyan-300">
            {analysis.robustness}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500">
            Original risk
          </p>

          <p className="mt-1 text-2xl font-bold text-white">
            {analysis.original_score}/100
          </p>

          <p className="mt-1 text-xs capitalize text-slate-400">
            {analysis.original_verdict}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500">
            Evidence tested
          </p>

          <p className="mt-1 text-2xl font-bold text-white">
            {analysis.tested_evidence_count}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            One item removed per test
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500">
            Strongest dependency
          </p>

          <p className="mt-1 break-words text-sm font-bold text-white">
            {strongest
              ? strongest.removed_evidence
              : "None detected"}
          </p>

          <p className="mt-1 text-xs text-cyan-300">
            {strongest
              ? strongest.score_impact > 0
                ? `${strongest.score_impact} point score impact`
                : `${strongest.potential_impact} potential points behind score cap`
              : "No positive-risk evidence"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
          <p className="text-xs text-slate-500">
            Content signals
          </p>

          <p className="mt-1 font-semibold text-blue-300">
            +{breakdown.content_score || 0}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
          <p className="text-xs text-slate-500">
            Consistency signals
          </p>

          <p className="mt-1 font-semibold text-purple-300">
            +{breakdown.consistency_score || 0}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
          <p className="text-xs text-slate-500">
            Authentication signals
          </p>

          <p className="mt-1 font-semibold text-amber-300">
            +{breakdown.authentication_score || 0}
          </p>
        </div>
      </div>

      {visibleTests.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-slate-200">
            Highest-impact tests
          </p>

          {visibleTests.map((test) => (
            <div
              key={test.evidence_id}
              className={`rounded-xl border p-4 ${impactStyle(
                test.impact_level
              )}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    Remove: {test.removed_evidence}
                  </p>

                  <p className="mt-1 text-xs opacity-70">
                    {test.category} evidence • {test.evidence_id}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-lg font-bold">
                    {test.original_score} → {test.new_score}
                  </p>

                  <p className="text-xs capitalize opacity-80">
                    {test.new_verdict}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {analysis.limitations}
      </p>
    </div>
  )
}


function ForensicGraph({ graph }) {
  if (
    !graph ||
    !graph.nodes ||
    graph.nodes.length === 0
  ) {
    return (
      <p className="text-slate-500">
        No graph data available.
      </p>
    )
  }

  const getNodeStyle = (type) => {
    switch (type) {
      case "email":
        return "border-blue-500 bg-blue-950 text-blue-200"

      case "sender":
        return "border-purple-500 bg-purple-950 text-purple-200"

      case "url":
        return "border-red-500 bg-red-950 text-red-200"

      case "ip":
        return "border-yellow-500 bg-yellow-950 text-yellow-200"

      case "location":
        return "border-green-500 bg-green-950 text-green-200"

      default:
        return "border-slate-600 bg-slate-900 text-white"
    }
  }

  const emailNode = graph.nodes.find(
    (node) => node.type === "email"
  )

  const otherNodes = graph.nodes.filter(
    (node) => node.type !== "email"
  )

  return (
    <div className="w-full">
      <CounterfactualPanel
        analysis={
          graph.counterfactual_analysis
        }
      />

      {emailNode && (
        <div className="flex justify-center">
          <div
            className={`border rounded-xl px-6 py-4 text-center ${getNodeStyle(
              emailNode.type
            )}`}
          >
            <p className="font-semibold">
              {emailNode.label}
            </p>

            <p className="text-xs mt-1 opacity-70">
              EMAIL
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div className="h-10 border-l-2 border-slate-700"></div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {otherNodes.map((node, index) => (
          <div
            key={index}
            className="flex flex-col items-center"
          >
            <div
              className={`w-full border rounded-xl p-4 text-center ${getNodeStyle(
                node.type
              )}`}
            >
              <p className="font-semibold break-all">
                {node.label}
              </p>

              <p className="text-xs mt-2 uppercase opacity-70">
                {node.type}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-3">
          Relationships
        </h3>

        <div className="grid md:grid-cols-2 gap-3">
          {graph.edges.map((edge, index) => (
            <div
              key={index}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3"
            >
              <p className="text-sm text-slate-300 break-all">
                {edge.source}
              </p>

              <p className="text-blue-400 text-sm my-1">
                ↓ {edge.relation}
              </p>

              <p className="text-sm text-slate-300 break-all">
                {edge.target}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ForensicGraph