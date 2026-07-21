export type QueueStatus = 'queued' | 'playing' | 'done'

export interface Room {
  id: string
  code: string
  name: string
  is_playing: boolean
  current_id: string | null
  created_at: string
  last_seen_at: string
}

export interface QueueItem {
  id: string
  room_id: string
  video_id: string
  title: string
  channel: string
  thumbnail: string
  singer: string
  status: QueueStatus
  sort_order: number
  created_at: string
}

/**
 * Type de version cherchée sur YouTube.
 * - `karaoke` : instrumental avec paroles incrustées
 * - `original` : le clip d'origine, voix comprise
 */
export type SearchMode = 'karaoke' | 'original'

/** Résultat de recherche YouTube, avant ajout à la file. */
export interface SearchResult {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}
