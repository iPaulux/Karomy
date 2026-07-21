import type { Config, Context } from '@netlify/functions'

/**
 * Proxy de recherche YouTube.
 *
 * La clé API vit ici, côté serveur : elle ne doit jamais être exposée dans le
 * bundle client. Sans `YOUTUBE_API_KEY`, on répond 501 et le front bascule
 * automatiquement sur le mode « coller un lien YouTube ».
 */

interface YouTubeSearchResponse {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      channelTitle?: string
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
    }
  }>
}

/** Décode les entités HTML que l'API YouTube renvoie dans les titres. */
function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

const json = (body: unknown, status: number, cacheSeconds = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': cacheSeconds
        ? `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`
        : 'no-store',
    },
  })

export default async (req: Request, _context: Context): Promise<Response> => {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return json({ error: 'YOUTUBE_API_KEY non configurée' }, 501)
  }

  const query = new URL(req.url).searchParams.get('q')?.trim()
  if (!query) {
    return json({ error: 'Paramètre `q` manquant' }, 400)
  }
  if (query.length > 120) {
    return json({ error: 'Requête trop longue' }, 400)
  }

  // On oriente la recherche vers le karaoké : ce sont les vidéos avec paroles
  // incrustées, ce que la vue room attend.
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search')
  endpoint.searchParams.set('key', apiKey)
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('type', 'video')
  endpoint.searchParams.set('videoEmbeddable', 'true')
  endpoint.searchParams.set('videoSyndicated', 'true')
  endpoint.searchParams.set('maxResults', '12')
  endpoint.searchParams.set('q', `${query} karaoke`)

  let upstream: Response
  try {
    upstream = await fetch(endpoint, { signal: AbortSignal.timeout(8000) })
  } catch {
    return json({ error: 'YouTube injoignable' }, 502)
  }

  if (!upstream.ok) {
    // Le plus souvent : quota journalier dépassé (403).
    const detail = upstream.status === 403 ? 'Quota YouTube dépassé' : 'Erreur YouTube'
    return json({ error: detail }, upstream.status === 403 ? 429 : 502)
  }

  const data = (await upstream.json()) as YouTubeSearchResponse

  const results = (data.items ?? [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: decodeEntities(item.snippet?.title ?? 'Sans titre'),
      channel: decodeEntities(item.snippet?.channelTitle ?? ''),
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        `https://i.ytimg.com/vi/${item.id!.videoId}/mqdefault.jpg`,
    }))

  // Les résultats bougent peu : on met en cache 10 min au bord pour épargner
  // le quota YouTube (100 unités par recherche, 10 000 unités/jour par défaut).
  return json({ results }, 200, 600)
}

export const config: Config = {
  path: '/api/search',
}
