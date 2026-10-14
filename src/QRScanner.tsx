import type { IScannerControls } from "@zxing/browser"
import { useEffect, useRef, useState } from "react"
import Icon from "./Icon"

type Props = {
  onClose: () => void
  onResult: (value: string) => void
  codes?: { code: string; label: string }[]
}

export default function QRScanner({ onClose, onResult, codes = [] }: Props) {
  const [simulating, setSimulating] = useState("")
  function simulate(code: string) {
    if (delivered.current) return
    setSimulating(code)
    window.setTimeout(() => {
      delivered.current = true
      controlsRef.current?.stop()
      onResult(code)
    }, 900)
  }
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const delivered = useRef(false)
  const [manual, setManual] = useState("")
  const [overrideReason, setOverrideReason] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState(
    "Point the camera at a KFMC location code.",
  )

  useEffect(() => {
    let mounted = true

    import("@zxing/browser")
      .then(({ BrowserQRCodeReader }) => {
        if (!mounted) return
        const reader = new BrowserQRCodeReader()
        return reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current || undefined,
          (result) => {
            if (!result || delivered.current) return
            delivered.current = true
            controlsRef.current?.stop()
            onResult(result.getText())
          },
        )
      })
      .then((controls) => {
        if (!controls) return
        if (mounted) controlsRef.current = controls
        else controls.stop()
      })
      .catch(() => {
        if (mounted) {
          setMessage(
            "Camera access is unavailable. Enter the printed code below instead.",
          )
        }
      })

    return () => {
      mounted = false
      controlsRef.current?.stop()
    }
  }, [onResult])

  function submitManual() {
    const value = manual.trim()
    if (!value || overrideReason.trim().length < 5) {
      setError(
        "Enter the code and a supervisor authorization reference or override reason.",
      )
      return
    }
    delivered.current = true
    controlsRef.current?.stop()
    onResult(value)
  }

  return (
    <div className="scanner-backdrop" role="dialog" aria-modal="true">
      <section className="scanner-sheet">
        <header>
          <div>
            <span className="eyebrow">Location verification</span>
            <h2>Scan QR code</h2>
          </div>
          <button aria-label="Close scanner" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="scanner-view">
          <video ref={videoRef} muted playsInline />
          {simulating && (
            <div className="scanner-simulated">
              <span />
              <strong>Reading {simulating}…</strong>
            </div>
          )}
          <div className="scanner-guide" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <p>{message}</p>
        {codes.length > 0 && (
          <div className="scanner-demo">
            <small>Demo scan · tap a location tag to simulate</small>
            <div>
              {codes.map((entry) => (
                <button key={entry.code} onClick={() => simulate(entry.code)} disabled={Boolean(simulating)}>
                  <Icon name="scan" size={15} />
                  <span>
                    <b>{entry.code}</b>
                    {entry.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="scanner-manual">
          <Icon name="scan" size={18} />
          <input
            aria-label="Enter location code"
            placeholder="e.g. Z-A1-W4"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitManual()
            }}
          />
        </div>
        <label className="scanner-override">
          Supervisor-authorized override reason
          <input
            placeholder="Authorization reference and reason"
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
          />
        </label>
        {error && <p className="scanner-error">{error}</p>}
        <button className="ops-primary scanner-verify" onClick={submitManual}>
          Verify manual override
        </button>
      </section>
    </div>
  )
}
