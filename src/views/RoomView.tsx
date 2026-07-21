import { useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../lib/useRoom'
import { playNext, setPlaying } from '../lib/rooms'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { QrCode } from '../components/QrCode'
import { Plumbob, Wordmark } from '../components/Plumbob'
import { IconPause, IconPlay, IconSkip, IconSpinner } from '../components/icons'
import { Screen } from '../components/Screen'
import { Confetti } from '../components/Confetti'
import { useTheme } from '../lib/useTheme'
import type { QueueItem, RoomTheme } from '../lib/types'

/**
 * Vue "room" : l'écran partagé (télé, vidéoprojecteur, laptop).
 * C'est le maître de la lecture — les téléphones ne font qu'alimenter la file.
 */
export function RoomView() {
  const { code } = useParams<{ code: string }>()
  const { room, queue, current, loading, error } = useRoom(code)

  useTheme(room?.theme)

  const joinUrl = `${window.location.origin}/j/${code?.toUpperCase() ?? ''}`
  const upcoming = queue.filter((q) => q.status === 'queued')

  // `playNext` est asynchrone : tant qu'il n'a pas rendu la main, `current_id`
  // vaut encore null. Sans ce verrou, un événement realtime arrivant entre-temps
  // relancerait l'enchaînement et sauterait une chanson.
  const advancing = useRef(false)

  const handleNext = useCallback(async () => {
    if (!room || advancing.current) return
    advancing.current = true
    try {
      await playNext(room)
    } catch (e) {
      console.error('[Karomy] passage au morceau suivant impossible', e)
    } finally {
      advancing.current = false
    }
  }, [room])

  // Démarre automatiquement dès qu'une première chanson arrive dans une room
  // au repos : personne n'a besoin de se lever pour lancer la soirée.
  useEffect(() => {
    if (room && !room.current_id && upcoming.length > 0) {
      void handleNext()
    }
  }, [room, upcoming.length, handleNext])

  // Raccourcis clavier pour piloter depuis le clavier de la télé/laptop.
  useEffect(() => {
    if (!room) return

    function onKey(event: KeyboardEvent) {
      if (!room) return
      if (event.key === ' ') {
        event.preventDefault()
        void setPlaying(room.id, !room.is_playing)
      }
      if (event.key === 'ArrowRight' || event.key === 'n') void handleNext()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room, handleNext])

  if (loading) return <Screen><IconSpinner size={44} /></Screen>
  if (error || !room) return <Screen>{error ?? 'Room introuvable.'}</Screen>

  return (
    <div className="wallpaper room-grid">
      {room.theme === 'birthday' && <Confetti />}

      {/* ---- Scène : la vidéo karaoké et ses contrôles ---- */}
      <main style={{ display: 'flex', flexDirection: 'column', padding: 24, gap: 18, minWidth: 0 }}>
        <div
          style={{
            position: 'relative',
            flex: 1,
            borderRadius: 'var(--r-xl)',
            border: '4px solid var(--oak)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            background: 'var(--walnut)',
          }}
        >
          {current ? (
            <YouTubePlayer
              videoId={current.video_id}
              playing={room.is_playing}
              onEnded={handleNext}
            />
          ) : (
            <IdleStage joinUrl={joinUrl} code={room.code} theme={room.theme} />
          )}
        </div>

        {current && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="pill pill-live"
                style={{ marginBottom: 6 }}
              >
                <Plumbob size={11} /> Au micro · {current.singer}
              </div>
              <h2 className="truncate" style={{ fontSize: '1.7rem', color: 'var(--walnut)' }}>
                {current.title}
              </h2>
            </div>

            <button
              className="btn btn-primary btn-icon"
              onClick={() => void setPlaying(room.id, !room.is_playing)}
              aria-label={room.is_playing ? 'Mettre en pause' : 'Reprendre'}
              style={{ width: 58, height: 58 }}
            >
              {room.is_playing ? <IconPause size={26} /> : <IconPlay size={26} />}
            </button>

            <button
              className="btn btn-blush btn-icon"
              onClick={handleNext}
              aria-label="Chanson suivante"
              style={{ width: 58, height: 58 }}
            >
              <IconSkip size={26} />
            </button>
          </div>
        )}
      </main>

      {/* ---- Panneau latéral : rejoindre + file d'attente ---- */}
      <aside className="room-aside">
        <div className="card" style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
          <Wordmark size="sm" />
          <QrCode value={joinUrl} size={168} />
          <div style={{ textAlign: 'center' }}>
            <div className="faint" style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em' }}>
              CODE DE LA ROOM
            </div>
            <div
              className="display"
              style={{
                fontSize: '2.9rem',
                letterSpacing: '0.16em',
                color: 'var(--plumb-deep)',
                lineHeight: 1.1,
              }}
            >
              {room.code}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, padding: 18 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--walnut)' }}>File d'attente</h3>
            <span className="pill">{upcoming.length}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 8, alignContent: 'start' }}>
            {upcoming.length === 0 ? (
              <p className="faint" style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', padding: '24px 8px' }}>
                Personne dans la file.
                <br />
                Scannez le QR code pour ajouter une chanson !
              </p>
            ) : (
              upcoming.map((item, index) => <QueueRow key={item.id} item={item} index={index} />)
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

/** Écran d'accueil affiché quand aucune chanson n'est en cours. */
function IdleStage({
  joinUrl,
  code,
  theme,
}: {
  joinUrl: string
  code: string
  theme: RoomTheme
}) {
  return (
    <div
      className="wallpaper"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        textAlign: 'center',
        padding: 40,
      }}
    >
      <Plumbob size={80} />
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: 'var(--walnut)' }}>
        {theme === 'birthday' ? 'Joyeux anniversaire !' : 'À qui le tour ?'}
      </h1>
      <QrCode value={joinUrl} size={200} />
      <p className="muted" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
        Scannez, ou allez sur <strong>{window.location.host}</strong> avec le code{' '}
        <strong style={{ color: 'var(--plumb-deep)', letterSpacing: '0.1em' }}>{code}</strong>
      </p>
    </div>
  )
}

function QueueRow({ item, index }: { item: QueueItem; index: number }) {
  return (
    <div
      className="card-flat pop-in"
      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 9, minWidth: 0 }}
    >
      <span
        className="display"
        style={{
          flexShrink: 0,
          width: 26,
          textAlign: 'center',
          fontSize: '1.1rem',
          color: 'var(--ink-faint)',
        }}
      >
        {index + 1}
      </span>
      <img
        src={item.thumbnail}
        alt=""
        width={54}
        height={40}
        loading="lazy"
        style={{ flexShrink: 0, borderRadius: 8, objectFit: 'cover', background: 'var(--cream-deep)' }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="truncate" style={{ fontWeight: 800, fontSize: '0.86rem' }}>
          {item.title}
        </div>
        <div className="truncate muted" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
          {item.singer}
        </div>
      </div>
    </div>
  )
}
