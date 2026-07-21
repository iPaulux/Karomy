import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '../lib/useRoom'
import { addToQueue, moveItem, removeFromQueue } from '../lib/rooms'
import { SearchUnavailableError, parseVideoId, searchKaraoke, thumbnailFor } from '../lib/youtube'
import { Plumbob, Wordmark } from '../components/Plumbob'
import { Screen } from '../components/Screen'
import {
  IconCheck,
  IconDown,
  IconLink,
  IconMic,
  IconNote,
  IconPlus,
  IconSearch,
  IconSpinner,
  IconTrash,
  IconUp,
} from '../components/icons'
import type { SearchMode, SearchResult } from '../lib/types'

const NAME_KEY = 'karomy:singer'
const MODE_KEY = 'karomy:mode'

/**
 * Vue téléphone : on choisit un pseudo, on cherche une chanson, on l'ajoute.
 * Aucun contrôle de lecture — c'est l'écran room qui mène la danse.
 */
export function PhoneView() {
  const { code } = useParams<{ code: string }>()
  const { room, queue, current, loading, error, refresh } = useRoom(code)
  const [singer, setSinger] = useState(() => localStorage.getItem(NAME_KEY) ?? '')

  if (loading) return <Screen><IconSpinner size={44} /></Screen>
  if (error || !room) return <Screen>{error ?? 'Room introuvable.'}</Screen>

  if (!singer) {
    return (
      <NamePrompt
        roomCode={room.code}
        onDone={(name) => {
          localStorage.setItem(NAME_KEY, name)
          setSinger(name)
        }}
      />
    )
  }

  const upcoming = queue.filter((q) => q.status === 'queued')

  return (
    <div
      className="wallpaper"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 18px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--cream)',
          borderBottom: '3px solid var(--cream-deep)',
        }}
      >
        <Wordmark size="sm" />
        <div style={{ textAlign: 'right' }}>
          <div className="faint" style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>
            {room.code}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.8rem' }}
            onClick={() => {
              localStorage.removeItem(NAME_KEY)
              setSinger('')
            }}
          >
            {singer}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: 18, display: 'grid', gap: 20, alignContent: 'start' }}>
        {current && (
          <section className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <img
              src={current.thumbnail}
              alt=""
              width={64}
              height={48}
              style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: 'var(--cream-deep)' }}
            />
            <div style={{ minWidth: 0 }}>
              <div className="pill pill-live" style={{ marginBottom: 4 }}>
                <Plumbob size={10} /> En cours
              </div>
              <div className="clamp-2" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                {current.title}
              </div>
              <div className="truncate muted" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                {current.singer}
              </div>
            </div>
          </section>
        )}

        <SearchPanel roomId={room.id} singer={singer} onAdded={refresh} />

        <section style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--walnut)' }}>La file</h3>
            <span className="pill">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="faint" style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center', padding: 20 }}>
              La file est vide. À toi de lancer la soirée&nbsp;!
            </p>
          ) : (
            upcoming.map((item, index) => (
              <div
                key={item.id}
                className="card-flat pop-in"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}
              >
                <span
                  className="display"
                  style={{ width: 20, textAlign: 'center', color: 'var(--ink-faint)', flexShrink: 0 }}
                >
                  {index + 1}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="clamp-2" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                    {item.title}
                  </div>
                  <div className="truncate muted" style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                    {item.singer}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }}
                    onClick={() => void moveItem(queue, item.id, -1)}
                    disabled={index === 0}
                    aria-label="Monter dans la file"
                  >
                    <IconUp size={16} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }}
                    onClick={() => void moveItem(queue, item.id, 1)}
                    disabled={index === upcoming.length - 1}
                    aria-label="Descendre dans la file"
                  >
                    <IconDown size={16} />
                  </button>
                  {/* On ne peut retirer que ses propres chansons. */}
                  {item.singer === singer && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', color: 'var(--blush-deep)' }}
                      onClick={() => void removeFromQueue(item.id)}
                      aria-label="Retirer ma chanson"
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function NamePrompt({ roomCode, onDone }: { roomCode: string; onDone: (name: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <div
      className="wallpaper"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        padding: 24,
      }}
    >
      <Wordmark size="md" />
      <form
        className="card pop-in"
        style={{ width: '100%', maxWidth: 380, display: 'grid', gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onDone(value.trim().slice(0, 24))
        }}
      >
        <div>
          <span className="pill">Room {roomCode}</span>
          <h2 style={{ marginTop: 10, fontSize: '1.5rem', color: 'var(--walnut)' }}>
            Tu t'appelles comment&nbsp;?
          </h2>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.9rem', fontWeight: 600 }}>
            Ce nom s'affichera sur la télé quand ce sera ton tour.
          </p>
        </div>
        <input
          className="field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ton pseudo"
          maxLength={24}
          autoFocus
          aria-label="Ton pseudo"
        />
        <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
          C'est parti
        </button>
      </form>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function SearchPanel({
  roomId,
  singer,
  onAdded,
}: {
  roomId: string
  singer: string
  onAdded: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Si la fonction Netlify n'a pas de clé API, on bascule sur le collage de lien.
  const [linkMode, setLinkMode] = useState(false)

  // Karaoké (instrumental + paroles) ou version originale avec la voix.
  // Le choix est mémorisé : on a rarement envie d'en changer en cours de soirée.
  const [mode, setMode] = useState<SearchMode>(
    () => (localStorage.getItem(MODE_KEY) as SearchMode | null) ?? 'karaoke',
  )

  function chooseMode(next: SearchMode) {
    setMode(next)
    localStorage.setItem(MODE_KEY, next)
  }

  const abortRef = useRef<AbortController | null>(null)

  // Recherche debouncée : on attend 400 ms de calme avant de taper l'API,
  // le quota YouTube étant limité. Changer de mode relance la recherche.
  useEffect(() => {
    if (linkMode) return

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setSearching(true)
      setMessage(null)

      searchKaraoke(trimmed, mode, controller.signal)
        .then((found) => {
          setResults(found)
          if (found.length === 0) setMessage('Aucun résultat. Essaie un autre titre.')
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          if (e instanceof SearchUnavailableError) {
            setLinkMode(true)
            setQuery('')
            setResults([])
            setMessage('Recherche indisponible ici — colle plutôt un lien YouTube.')
            return
          }
          setMessage(e instanceof Error ? e.message : 'Recherche impossible.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 400)

    return () => clearTimeout(timer)
  }, [query, linkMode, mode])

  async function handleAdd(video: SearchResult) {
    try {
      await addToQueue(roomId, video, singer)
      setAddedId(video.videoId)
      setTimeout(() => setAddedId(null), 1600)
      onAdded()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ajout impossible.")
    }
  }

  async function handleAddLink(event: React.FormEvent) {
    event.preventDefault()
    const videoId = parseVideoId(query)
    if (!videoId) {
      setMessage('Ce lien YouTube ne semble pas valide.')
      return
    }

    await handleAdd({
      videoId,
      // Sans clé API on ne peut pas récupérer le vrai titre ; la vignette
      // suffit à reconnaître le morceau sur la télé.
      title: 'Chanson ajoutée par lien',
      channel: '',
      thumbnail: thumbnailFor(videoId),
    })
    setQuery('')
  }

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      {!linkMode && (
        <div className="segmented" role="tablist" aria-label="Type de version">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'karaoke'}
            onClick={() => chooseMode('karaoke')}
          >
            <IconMic size={17} /> Karaoké
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'original'}
            onClick={() => chooseMode('original')}
          >
            <IconNote size={17} /> Originale
          </button>
        </div>
      )}

      <form onSubmit={linkMode ? handleAddLink : (e) => e.preventDefault()} style={{ display: 'grid', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-faint)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            {searching ? <IconSpinner size={20} /> : linkMode ? <IconLink size={20} /> : <IconSearch size={20} />}
          </span>
          <input
            className="field"
            style={{ paddingLeft: 48 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              linkMode
                ? 'Colle un lien YouTube'
                : mode === 'karaoke'
                  ? 'Cherche une version karaoké…'
                  : 'Cherche la version originale…'
            }
            inputMode={linkMode ? 'url' : 'search'}
            autoComplete="off"
            aria-label={linkMode ? 'Lien YouTube' : 'Rechercher une chanson'}
          />
        </div>

        {linkMode && (
          <button type="submit" className="btn btn-primary" disabled={!query.trim()}>
            <IconPlus /> Ajouter à la file
          </button>
        )}
      </form>

      {message && (
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
          {message}
        </p>
      )}

      {results.map((video) => {
        const justAdded = addedId === video.videoId
        return (
          <div
            key={video.videoId}
            className="card-flat"
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10 }}
          >
            <img
              src={video.thumbnail}
              alt=""
              width={68}
              height={51}
              loading="lazy"
              style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: 'var(--cream-deep)' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="clamp-2" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                {video.title}
              </div>
              <div className="truncate muted" style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                {video.channel}
              </div>
            </div>
            <button
              className={justAdded ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
              style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', flexShrink: 0 }}
              onClick={() => void handleAdd(video)}
              aria-label={`Ajouter ${video.title} à la file`}
            >
              {justAdded ? <IconCheck size={18} /> : <IconPlus size={18} />}
            </button>
          </div>
        )
      })}
    </section>
  )
}
