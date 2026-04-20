type JuiceMarkProps = {
  className?: string
  title?: string
}

export function JuiceMark({ className, title = "Juice" }: JuiceMarkProps) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M9 4 L10.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M3.5 4h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path
        d="M4 4h6l-1 8.5H5L4 4Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
