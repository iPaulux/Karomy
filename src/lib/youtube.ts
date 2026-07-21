import type { SearchResult } from './types'

/** Levée quand la fonction Netlify n'a pas de clé API configurée. */
export class SearchUnavailableError extends Error {
  constructor() {
    super("La recherche YouTube n'est pas configurée sur ce déploiement.")
    this.name = 'SearchUnavailableError'
  }
}

/**
 * Recherche des vidéos karaoké via la fonction Netlify (qui détient la clé
 * API YouTube côté serveur — elle ne doit jamais arriver dans le bundle).
 */
export async function searchKaraoke(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
    headers: { accept: 'application/json' },
  })

  // 501 = pas de clé API côté serveur. On tombe aussi ici quand la fonction
  // n'est pas déployée du tout (en `vite dev` par exemple) : le SPA fallback
  // renvoie alors index.html en 200, d'où le contrôle du content-type.
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (res.status === 501 || !isJson) throw new SearchUnavailableError()

  if (res.status === 429) throw new Error('Trop de recherches pour aujourd’hui.')
  if (!res.ok) throw new Error('La recherche a échoué, réessaie.')

  const body = (await res.json()) as { results?: SearchResult[] }
  return body.results ?? []
}

/**
 * Extrait l'identifiant d'une vidéo depuis une URL YouTube (watch, youtu.be,
 * shorts, embed) ou depuis un ID collé tel quel. Retourne null si rien ne colle.
 */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // ID nu : exactement 11 caractères de l'alphabet YouTube.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  let url: URL
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    return /^[\w-]{11}$/.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const v = url.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v

    const match = url.pathname.match(/^\/(?:embed|shorts|v|live)\/([\w-]{11})/)
    if (match) return match[1]
  }

  return null
}

export function thumbnailFor(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
}
