import { supabase } from './supabase'
import type { QueueItem, Room, RoomTheme, SearchResult } from './types'

/** Alphabet sans I/O/0/1 : évite les confusions quand on dicte un code. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(length = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * Crée une room avec un code court unique. En cas de collision (rare mais
 * possible sur 32^4 ≈ 1M combinaisons), on retente avec un nouveau code.
 */
export async function createRoom(theme: RoomTheme = 'normal', name = 'Karaoké'): Promise<Room> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase
      .from('rooms')
      .insert({ code: randomCode(), name, theme })
      .select()
      .single()

    if (!error) return data as Room
    // 23505 = violation de contrainte d'unicité → le code est déjà pris.
    if (error.code !== '23505') throw error
  }
  throw new Error("Impossible de générer un code de room libre, réessayez.")
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (error) throw error
  return (data as Room) ?? null
}

export async function touchRoom(roomId: string): Promise<void> {
  await supabase
    .from('rooms')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', roomId)
}

export async function fetchQueue(roomId: string): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('queue_items')
    .select()
    .eq('room_id', roomId)
    .neq('status', 'done')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as QueueItem[]
}

export async function addToQueue(
  roomId: string,
  video: SearchResult,
  singer: string,
): Promise<void> {
  const { error } = await supabase.from('queue_items').insert({
    room_id: roomId,
    video_id: video.videoId,
    title: video.title,
    channel: video.channel,
    thumbnail: video.thumbnail,
    singer: singer.trim() || 'Anonyme',
  })
  if (error) throw error
}

/**
 * Retire un morceau de la file.
 *
 * Volontairement un soft-delete (`status = 'done'`) et non un vrai DELETE :
 * l'événement realtime d'un DELETE ne transporte que la clé primaire de la
 * ligne supprimée, jamais son `room_id` — le filtre `postgres_changes` de
 * useRoom ne le laisserait donc pas passer et aucun écran ne serait prévenu.
 * Un UPDATE transporte la ligne complète et se propage normalement.
 */
export async function removeFromQueue(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('queue_items')
    .update({ status: 'done' })
    .eq('id', itemId)
  if (error) throw error
}

/**
 * Passe au morceau suivant : l'actuel est archivé, le premier de la file
 * devient `playing` et est pointé par `room.current_id`.
 */
export async function playNext(room: Room): Promise<void> {
  if (room.current_id) {
    await supabase
      .from('queue_items')
      .update({ status: 'done' })
      .eq('id', room.current_id)
  }

  const { data, error } = await supabase
    .from('queue_items')
    .select()
    .eq('room_id', room.id)
    .eq('status', 'queued')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const next = data as QueueItem | null

  if (!next) {
    await supabase
      .from('rooms')
      .update({ current_id: null, is_playing: false })
      .eq('id', room.id)
    return
  }

  await supabase.from('queue_items').update({ status: 'playing' }).eq('id', next.id)
  await supabase
    .from('rooms')
    .update({ current_id: next.id, is_playing: true })
    .eq('id', room.id)
}

export async function setPlaying(roomId: string, isPlaying: boolean): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ is_playing: isPlaying })
    .eq('id', roomId)
  if (error) throw error
}

/**
 * Déplace un morceau vers le haut ou le bas de la file en réécrivant son
 * `sort_order` à mi-chemin entre ses nouveaux voisins — pas de renumérotation
 * globale, donc pas de conflit entre deux téléphones qui trient en même temps.
 */
export async function moveItem(
  queue: QueueItem[],
  itemId: string,
  direction: -1 | 1,
): Promise<void> {
  const pending = queue.filter((q) => q.status === 'queued')
  const index = pending.findIndex((q) => q.id === itemId)
  const target = index + direction

  if (index === -1 || target < 0 || target >= pending.length) return

  const neighbour = pending[target]
  const beyond = pending[target + direction]

  const newOrder = beyond
    ? (neighbour.sort_order + beyond.sort_order) / 2
    : neighbour.sort_order + direction * 1000

  const { error } = await supabase
    .from('queue_items')
    .update({ sort_order: newOrder })
    .eq('id', itemId)

  if (error) throw error
}
