import { HashRouter, Route, Routes } from "react-router-dom"

import { DesktopAssistant } from "@/features/assistant/desktop-assistant"

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DesktopAssistant />} />
      </Routes>
    </HashRouter>
  )
}
