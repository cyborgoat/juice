export function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all text-sm font-medium">{value}</p>
    </div>
  )
}

export function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
