import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * QR code rendu en data-URL, aux couleurs de la DA (encre brune sur parchemin)
 * plutôt que le noir sur blanc par défaut.
 */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void QRCode.toDataURL(value, {
      width: size * 2, // rendu 2× pour rester net sur écran HiDPI
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#4a3728ff', light: '#fffdf8ff' },
    })
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch((e) => console.error('[Karomy] génération du QR code impossible', e))

    return () => {
      cancelled = true
    }
  }, [value, size])

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--r-md)',
        background: 'var(--parchment)',
        border: '3px solid var(--oak)',
        padding: 8,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {src && (
        <img
          src={src}
          alt={`QR code vers ${value}`}
          width={size - 22}
          height={size - 22}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
