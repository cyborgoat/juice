import { HashRouter, Route, Routes } from "react-router-dom"

import { ChatPanel } from "@/features/chat/chat-panel"

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ChatPanel />} />
      </Routes>
    </HashRouter>
  )
}
