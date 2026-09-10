import { useState } from "react"

import LoginPage from "./pages/LoginPage"
import AnalysisPage from "./pages/AnalysisPage"
import HistoryPage from "./pages/HistoryPage"


function App() {
  const [loggedIn, setLoggedIn] =
    useState(false)

  const [page, setPage] =
    useState("dashboard")


  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = () => {
    setLoggedIn(true)
    setPage("dashboard")
  }


  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    setLoggedIn(false)
    setPage("dashboard")
  }


  // ==========================================
  // LOGIN PAGE
  // ==========================================

  if (!loggedIn) {
    return (
      <LoginPage
        onLogin={handleLogin}
      />
    )
  }


  // ==========================================
  // HISTORY PAGE
  // ==========================================

  if (page === "history") {
    return (
      <HistoryPage
        onBack={() =>
          setPage("dashboard")
        }
      />
    )
  }


  // ==========================================
  // ANALYSIS DASHBOARD
  // ==========================================

  return (
    <div>

      {/* GLOBAL NAVIGATION */}

      <div
        className="
          fixed
          top-4
          right-6
          z-50
          flex
          items-center
          gap-2
        "
      >

        {/* HISTORY */}

        <button
          onClick={() =>
            setPage("history")
          }
          className="
            bg-blue-950/80
            hover:bg-blue-900
            border
            border-blue-800/60
            hover:border-blue-600
            px-4
            py-2
            rounded-xl
            text-blue-200
            text-sm
            font-semibold
            backdrop-blur-xl
            transition-all
            duration-300
            hover:-translate-y-[1px]
            hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]
          "
        >
          History
        </button>


        {/* LOGOUT */}

        <button
          onClick={
            handleLogout
          }
          className="
            bg-slate-900/80
            hover:bg-red-950
            border
            border-slate-700
            hover:border-red-900
            px-4
            py-2
            rounded-xl
            text-white
            text-sm
            font-semibold
            backdrop-blur-xl
            transition-all
            duration-300
          "
        >
          Logout
        </button>

      </div>


      <AnalysisPage />

    </div>
  )
}


export default App