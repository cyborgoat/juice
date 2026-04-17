import { BrowserRouter, Route, Routes } from "react-router-dom"

import { DesktopAssistant } from "@/features/assistant/desktop-assistant"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DesktopAssistant />} />
      </Routes>
    </BrowserRouter>
  )
}
