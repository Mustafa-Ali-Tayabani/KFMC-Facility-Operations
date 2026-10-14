import { useEffect, useState, type ReactNode } from "react"

const query = "(max-width: 560px)"

export default function DeviceFrame({ children }: { children: ReactNode }) {
  const [native, setNative] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const change = () => setNative(media.matches)
    media.addEventListener("change", change)
    return () => media.removeEventListener("change", change)
  }, [])

  // On a phone-sized viewport (real device or device preview) render edge to edge.
  if (native) return <div className="device-app device-native">{children}</div>

  return (
    <main className="device-stage">
      <div className="device-shell" aria-label="iPhone 17 Pro preview">
        <span className="device-button device-button-action" aria-hidden="true" />
        <span className="device-button device-button-volume-up" aria-hidden="true" />
        <span className="device-button device-button-volume-down" aria-hidden="true" />
        <span className="device-button device-button-power" aria-hidden="true" />
        <div className="device-screen">
          <div className="device-status" aria-hidden="true">
            <span>9:41</span>
            <div className="dynamic-island" />
            <span className="device-signals">
              <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
              <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="17" height="8" rx="2" /><rect x="23" y="4" width="1.5" height="4" rx=".75" opacity=".4" /></svg>
            </span>
          </div>
          <div className="device-app">{children}</div>
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
    </main>
  )
}
