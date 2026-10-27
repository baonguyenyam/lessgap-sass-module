export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-[500px]" />
      <div className="relative w-full max-w-md px-4">{children}</div>
    </div>
  )
}
