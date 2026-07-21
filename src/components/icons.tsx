/**
 * Icônes maison, trait épais et bouts arrondis pour coller au côté "jouet"
 * de la DA. Aucune librairie d'icônes : ça évite 40 ko de dépendance.
 */

interface IconProps {
  size?: number
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Svg({ size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

export const IconSearch = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="7" {...stroke} />
    <path d="M16.5 16.5 L21 21" {...stroke} />
  </Svg>
)

export const IconPlus = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" {...stroke} />
  </Svg>
)

export const IconPlay = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M7 4.5 L19 12 L7 19.5 Z" {...stroke} fill="currentColor" />
  </Svg>
)

export const IconPause = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M8.5 5v14M15.5 5v14" {...stroke} strokeWidth={3} />
  </Svg>
)

export const IconSkip = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M5 5 L15 12 L5 19 Z" {...stroke} fill="currentColor" />
    <path d="M19 5v14" {...stroke} strokeWidth={3} />
  </Svg>
)

export const IconTrash = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13" {...stroke} />
  </Svg>
)

export const IconUp = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M12 19V5M6 11l6-6 6 6" {...stroke} />
  </Svg>
)

export const IconDown = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M12 5v14M6 13l6 6 6-6" {...stroke} />
  </Svg>
)

export const IconMic = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" {...stroke} />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" {...stroke} />
  </Svg>
)

export const IconNote = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M9 18V5l10-2v13" {...stroke} />
    <circle cx="6.5" cy="18" r="2.6" {...stroke} />
    <circle cx="16.5" cy="16" r="2.6" {...stroke} />
  </Svg>
)

export const IconLink = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8" {...stroke} />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5" {...stroke} />
  </Svg>
)

export const IconSpinner = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="spin" aria-hidden="true">
    <circle cx="12" cy="12" r="9" {...stroke} opacity="0.25" />
    <path d="M12 3a9 9 0 0 1 9 9" {...stroke} />
  </svg>
)

export const IconCheck = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M5 12.5 L10 17.5 L19 7" {...stroke} strokeWidth={3} />
  </Svg>
)
