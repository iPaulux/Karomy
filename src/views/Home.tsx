import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, getRoomByCode } from '../lib/rooms'
import { Wordmark } from '../components/Plumbob'
import { IconMic, IconSpinner } from '../components/icons'

export function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setBusy('create')
    setError(null)
    try {
      const room = await createRoom()
      navigate(`/room/${room.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.')
      setBusy(null)
    }
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean.length < 4) return

    setBusy('join')
    setError(null)
    try {
      const room = await getRoomByCode(clean)
      if (!room) {
        setError(`Aucune room avec le code ${clean}.`)
        setBusy(null)
        return
      }
      navigate(`/j/${room.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.')
      setBusy(null)
    }
  }

  return (
    <div
      className="wallpaper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
        padding: '40px 20px',
        minHeight: '100dvh',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Wordmark size="lg" />
        <p className="muted" style={{ marginTop: 14, fontSize: '1.05rem', fontWeight: 600 }}>
          Le karaoké qui tient dans une poche.
        </p>
      </div>

      <div
        className="card pop-in"
        style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 22 }}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <span className="pill">Sur la télé</span>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleCreate}
            disabled={busy !== null}
            style={{ width: '100%' }}
          >
            {busy === 'create' ? <IconSpinner /> : <IconMic />}
            Ouvrir une room
          </button>
        </div>

        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: 'var(--ink-faint)',
            fontWeight: 800,
            fontSize: '0.8rem',
          }}
        >
          <span style={{ flex: 1, height: 3, background: 'var(--cream-deep)', borderRadius: 99 }} />
          OU
          <span style={{ flex: 1, height: 3, background: 'var(--cream-deep)', borderRadius: 99 }} />
        </div>

        <form onSubmit={handleJoin} style={{ display: 'grid', gap: 10 }}>
          <span className="pill">Sur ton téléphone</span>
          <input
            className="field field-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CODE"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-label="Code de la room"
          />
          <button
            type="submit"
            className="btn btn-sky"
            disabled={code.trim().length < 4 || busy !== null}
            style={{ width: '100%' }}
          >
            {busy === 'join' ? <IconSpinner /> : null}
            Rejoindre
          </button>
        </form>

        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '12px 16px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--blush)',
              color: '#6d2a24',
              fontWeight: 700,
              fontSize: '0.92rem',
            }}
          >
            {error}
          </p>
        )}
      </div>

      <p className="faint" style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
        Pas de compte, pas d'installation.
        <br />
        Ouvre une room, scanne le QR, chante.
      </p>
    </div>
  )
}
