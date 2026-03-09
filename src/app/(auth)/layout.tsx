// src/app/(auth)/layout.tsx
// ─────────────────────────────────────────────────────────
// This layout wraps BOTH the login and signup pages.
// Right now it just passes children through cleanly.
// Later we can add logic here like: 
// "if user is already logged in, redirect to dashboard"
// ─────────────────────────────────────────────────────────

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
  // "children" = whatever page is inside this layout
  // React.ReactNode = any valid React content
}) {
  return <>{children}</>
  // "<></>" is a React Fragment — an invisible wrapper
  // We return children unchanged for now
}