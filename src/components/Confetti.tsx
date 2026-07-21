import { useMemo } from 'react'

const COLORS = ['#ff9fb4', '#ffd166', '#c3aef0', '#7fd44a', '#8fc9e8', '#f0a7d8']

/**
 * Pluie de confettis du thème « birthday ».
 *
 * Chaque bandelette reçoit une position, une durée et un délai tirés une fois
 * pour toutes au montage — sans ça, chaque render redistribuerait les confettis
 * et l'animation sauterait.
 */
export function Confetti({ count = 26 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97) % 100, // réparti sans grappe, sans avoir l'air régulier
        color: COLORS[i % COLORS.length],
        duration: 5 + ((i * 7) % 6),
        delay: -((i * 13) % 11),
        width: i % 3 === 0 ? 7 : 10,
      })),
    [count],
  )

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <i
          key={i}
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            background: piece.color,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
