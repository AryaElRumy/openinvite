import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onScan: (text: string) => void
}

const CONTAINER_ID = 'qr-reader'

export default function QrScanner({ onScan }: Props) {
  const [error, setError] = useState('')

  useEffect(() => {
    const scanner = new Html5Qrcode(CONTAINER_ID)
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
  }, [onScan])

  return (
    <div className="qr-scanner">
      <div id={CONTAINER_ID} />
      {error !== '' && <p className="error">{error}</p>}
    </div>
  )
}