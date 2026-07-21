import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { fetchQueue, getRoomByCode, touchRoom } from './rooms'
import type { QueueItem, Room } from './types'

interface RoomState {
  room: Room | null
  queue: QueueItem[]
  current: QueueItem | null
  loading: boolean
  error: string | null
  /** Force un rechargement complet — utile après une action locale. */
  refresh: () => void
}

/**
 * Charge une room par son code et la garde synchronisée via Supabase Realtime.
 * Écran room et téléphones partagent ce hook : la file est identique partout.
 */
export function useRoom(code: string | undefined): RoomState {
  const [room, setRoom] = useState<Room | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // `roomId` dans une ref : le callback realtime doit y accéder sans
  // recréer l'abonnement à chaque render.
  const roomIdRef = useRef<string | null>(null)

  const reloadQueue = useCallback(async () => {
    const id = roomIdRef.current
    if (!id) return
    try {
      setQueue(await fetchQueue(id))
    } catch (e) {
      console.error('[Karomy] rechargement de la file impossible', e)
    }
  }, [])

  const refresh = useCallback(() => {
    void reloadQueue()
  }, [reloadQueue])

  useEffect(() => {
    if (!code) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const found = await getRoomByCode(code)
        if (cancelled) return

        if (!found) {
          setError(`Aucune room avec le code ${code.toUpperCase()}.`)
          setLoading(false)
          return
        }

        roomIdRef.current = found.id
        setRoom(found)
        setQueue(await fetchQueue(found.id))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Connexion impossible.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [code])

  // Abonnement realtime, recréé uniquement quand on change de room.
  useEffect(() => {
    const roomId = room?.id
    if (!roomId) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${roomId}` },
        () => void reloadQueue(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as Room),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [room?.id, reloadQueue])

  // Garde la room « vivante » pour que le ménage automatique l'épargne.
  useEffect(() => {
    const roomId = room?.id
    if (!roomId) return

    const timer = setInterval(() => void touchRoom(roomId), 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [room?.id])

  const current = room?.current_id
    ? queue.find((q) => q.id === room.current_id) ?? null
    : null

  return { room, queue, current, loading, error, refresh }
}
