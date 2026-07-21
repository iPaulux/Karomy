/**
 * Le plumbob : losange vert facetté flottant au-dessus des Sims.
 * C'est le logo de Karomy — dessiné en SVG pour rester net à toute taille.
 */
export function Plumbob({ size = 48, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size * 1.5}
      viewBox="0 0 40 60"
      className={animated ? 'plumbob' : undefined}
      aria-hidden="true"
    >
      {/* Facette gauche, la plus claire */}
      <path d="M20 0 L0 24 L20 30 Z" fill="#b7f183" />
      {/* Facette droite, en ombre */}
      <path d="M20 0 L40 24 L20 30 Z" fill="#7fd44a" />
      {/* Pointe basse gauche */}
      <path d="M0 24 L20 60 L20 30 Z" fill="#6cc236" />
      {/* Pointe basse droite, la plus sombre */}
      <path d="M40 24 L20 60 L20 30 Z" fill="#56a827" />
      {/* Éclat spéculaire */}
      <path d="M20 4 L6 22 L20 26 Z" fill="#ffffff" opacity="0.35" />
    </svg>
  )
}

/** Titre de marque : plumbob + wordmark. */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = { sm: 0.6, md: 1, lg: 1.5 }[size]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 * scale }}>
      <Plumbob size={34 * scale} />
      <span
        className="display"
        style={{
          fontSize: `${2.2 * scale}rem`,
          color: 'var(--walnut)',
          lineHeight: 1,
        }}
      >
        Karomy
      </span>
    </div>
  )
}
