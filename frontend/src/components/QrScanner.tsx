import { useEffect, useId, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onScan: (text: string) => void
}

export default function QrScanner({ onScan }: Props) {
  const [error, setError] = useState('')
  const containerId = `qr-reader-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    let active = true

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (text) => {
          if (!active) return
          active = false
          onScan(text)
          void scanner.stop().catch(() => {})
        },
        () => {},
      )
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission denied. Use manual lookup.'
            : 'Unable to start the camera. Use manual lookup.',
        )
      })

    return () => {
      active = false
      void scanner.stop().catch(() => {})
      try {
        scanner.clear()
      } catch {
        // Scanner may not have initialized.
      }
    }
  }, [containerId, onScan])

  return (
    <div className="flex flex-col gap-3">
      <div id={containerId} className="overflow-hidden rounded-xl" />
      {error !== '' && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}