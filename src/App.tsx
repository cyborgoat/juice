import { AppProviders } from "@/app/providers"
import { AppRouter } from "@/app/router"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <AppProviders>
      <AppRouter />
      <Toaster position="top-center" richColors closeButton />
    </AppProviders>
  )
}

export default App
