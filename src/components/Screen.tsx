import type { ReactNode } from 'react'
import { Plumbob } from './Plumbob'

/** Écran plein page pour les états de chargement, d'erreur et de configuration. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div
      className="wallpaper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        minHeight: '100dvh',
        padding: 32,
        textAlign: 'center',
        color: 'var(--ink-soft)',
        fontWeight: 700,
      }}
    >
      <Plumbob size={54} />
      {children}
    </div>
  )
}
