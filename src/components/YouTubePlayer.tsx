import { useEffect, useRef, useState } from 'react'

/* --- Typage minimal de l'API IFrame de YouTube ----------------------------- */

interface YTPlayer {
  loadVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
}

interface YTNamespace {
  Player: new (el: HTMLElement, options: unknown) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; UNSTARTED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

/**
 * Charge le script de l'API IFrame une seule fois pour toute l'application et
 * résout quand `window.YT` est prêt. Les appels concurrents partagent la
 * même promesse.
 */
let apiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }

    // YouTube appelle ce callback global une fois le script évalué.
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })

  return apiPromise
}

interface Props {
  videoId: string | null
  playing: boolean
  onEnded: () => void
}

export function YouTubePlayer({ videoId, playing, onEnded }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)

  // Le player ignore silencieusement toute commande reçue avant `onReady`.
  // On mémorise donc l'état voulu et on l'applique une fois qu'il répond.
  const readyRef = useRef(false)
  const startedRef = useRef(false)
  const loadedIdRef = useRef<string | null>(null)
  const wantedRef = useRef<{ videoId: string | null; playing: boolean }>({
    videoId: null,
    playing: false,
  })
  wantedRef.current = { videoId, playing }

  // Les navigateurs bloquent la lecture automatique avec son tant que
  // l'utilisateur n'a pas interagi avec la page. On le détecte et on propose
  // alors un bouton — sinon l'écran resterait noir sans explication.
  const [needsGesture, setNeedsGesture] = useState(false)

  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  /** Applique l'état voulu au player. Sans effet tant qu'il n'est pas prêt. */
  function sync() {
    const player = playerRef.current
    if (!player || !readyRef.current) return

    const { videoId: wantedId, playing: wantedPlaying } = wantedRef.current
    if (!wantedId) return

    if (loadedIdRef.current !== wantedId) {
      loadedIdRef.current = wantedId
      player.loadVideoById(wantedId)
      // `loadVideoById` démarre la lecture de lui-même ; inutile d'insister.
      if (!wantedPlaying) player.pauseVideo()
      return
    }

    if (wantedPlaying) player.playVideo()
    else player.pauseVideo()
  }

  useEffect(() => {
    let disposed = false

    void loadYouTubeApi().then((YT) => {
      if (disposed || !hostRef.current || playerRef.current) return

      playerRef.current = new YT.Player(hostRef.current, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            readyRef.current = true
            sync()

            // Si rien ne démarre dans la seconde, c'est que le navigateur a
            // bloqué la lecture automatique.
            setTimeout(() => {
              if (wantedRef.current.playing && !startedRef.current) setNeedsGesture(true)
            }, 1200)
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.PLAYING) {
              startedRef.current = true
              setNeedsGesture(false)
            }
            if (event.data === YT.PlayerState.ENDED) onEndedRef.current()
          },
          onError: (event: { data: number }) => {
            // 100/101/150 : vidéo supprimée, privée, ou non intégrable.
            // On enchaîne plutôt que de bloquer la soirée sur un écran noir.
            console.warn('[Karomy] vidéo illisible, on passe à la suivante', event.data)
            onEndedRef.current()
          },
        },
      })
    })

    return () => {
      disposed = true
      playerRef.current?.destroy()
      playerRef.current = null
      readyRef.current = false
      loadedIdRef.current = null
    }
  }, [])

  // Rejoue la synchro à chaque changement de morceau ou de play/pause.
  useEffect(() => {
    sync()
  }, [videoId, playing])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />

      {/* Voile transparent : empêche de cliquer dans l'iframe YouTube, la
          lecture se pilote uniquement par les boutons de la vue room. */}
      <div style={{ position: 'absolute', inset: 0 }} />

      {needsGesture && (
        <button
          className="btn btn-primary btn-lg"
          onClick={() => {
            setNeedsGesture(false)
            playerRef.current?.playVideo()
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius: 0,
            border: 'none',
            flexDirection: 'column',
            gap: 16,
            background: 'rgba(74, 55, 40, 0.92)',
            color: 'var(--cream)',
            fontSize: '1.6rem',
          }}
        >
          <span style={{ fontSize: '3rem' }}>▶</span>
          Cliquez pour lancer la musique
          <span style={{ fontSize: '0.95rem', opacity: 0.75, fontWeight: 600 }}>
            Le navigateur bloque le démarrage automatique du son.
          </span>
        </button>
      )}
    </div>
  )
}
