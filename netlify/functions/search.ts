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

interface Result {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}

/** Marqueurs d'une version karaoké / instrumentale dans un titre ou une chaîne. */
const KARAOKE_HINTS =
  /karaok|karafun|instrumental|backing track|playback|sing[- ]?along|minus one|no vocals?|sans voix/i

const isKaraoke = (r: Result) => KARAOKE_HINTS.test(`${r.title} ${r.channel}`)

/** Mode karaoké : les vraies versions karaoké d'abord, le reste en secours. */
function rankKaraokeFirst(results: Result[]): Result[] {
  return [...results.filter(isKaraoke), ...results.filter((r) => !isKaraoke(r))]
}

/**
 * Mode original : on écarte les versions karaoké. Si le filtre ne laisse rien
 * (titre contenant « karaoke » de façon légitime, recherche trop pointue), on
 * rend la liste brute plutôt qu'un écran vide.
 */
function rejectKaraoke(results: Result[]): Result[] {
  const kept = results.filter((r) => !isKaraoke(r))
  return kept.length > 0 ? kept : results
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

  const params = new URL(req.url).searchParams

  const query = params.get('q')?.trim()
  if (!query) {
    return json({ error: 'Paramètre `q` manquant' }, 400)
  }
  if (query.length > 120) {
    return json({ error: 'Requête trop longue' }, 400)
  }

  // `karaoke` (défaut) : vidéos instrumentales avec paroles incrustées.
  // `original` : le clip original, voix comprise — pour chanter par-dessus.
  const mode = params.get('mode') === 'original' ? 'original' : 'karaoke'

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search')
  endpoint.searchParams.set('key', apiKey)
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('type', 'video')
  endpoint.searchParams.set('videoEmbeddable', 'true')
  endpoint.searchParams.set('videoSyndicated', 'true')
  // On demande large : le tri ci-dessous en écarte une partie, et il faut qu'il
  // reste de quoi remplir les 12 résultats affichés.
  endpoint.searchParams.set('maxResults', '25')
  endpoint.searchParams.set('q', mode === 'karaoke' ? `${query} karaoke` : query)

  // Catégorie « Music » : en mode original, ça écarte les reactions, lyric
  // videos amateurs et autres contenus parasites.
  if (mode === 'original') endpoint.searchParams.set('videoCategoryId', '10')

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

  const mapped = (data.items ?? [])
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

  // L'opérateur `-` de YouTube ne fait qu'atténuer un terme, il ne l'exclut pas :
  // sans ce tri côté serveur, une recherche « originale » remonte surtout des
  // reprises karaoké, qui dominent les résultats pour les chansons connues.
  const results = (mode === 'karaoke' ? rankKaraokeFirst(mapped) : rejectKaraoke(mapped)).slice(
    0,
    12,
  )

  // Les résultats bougent peu : on met en cache 10 min au bord pour épargner
  // le quota YouTube (100 unités par recherche, 10 000 unités/jour par défaut).
  return json({ results }, 200, 600)
}

export const config: Config = {
  path: '/api/search',
}
