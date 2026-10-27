"use client"

import { useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

const EVENT = "theme-change"

function stored(): Theme {
  const value = localStorage.getItem("theme")
  return value === "dark" || value === "light" ? value : "system"
}

/**
 * The theme choice, kept in localStorage ("theme") and applied as the `dark`
 * class on <html>. Every component using it follows a change made by another
 * (the header switch and Settings → Preferences). `theme` is null until mounted.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null)
  const [, force] = useState(0)

  useEffect(() => {
    const sync = () => setTheme(stored())
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      document.documentElement.classList.toggle("dark", mq.matches)
      force((n) => n + 1)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  function apply(next: Theme) {
    if (next === "system") {
      localStorage.removeItem("theme")
      document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)
    } else {
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
    }
    window.dispatchEvent(new Event(EVENT))
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return { theme, apply, isDark }
}
