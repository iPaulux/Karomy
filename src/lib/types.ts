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

/** Résultat de recherche YouTube, avant ajout à la file. */
export interface SearchResult {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}
