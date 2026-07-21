import type { Plugin } from 'vite'

/**
 * Sert les fonctions Netlify pendant `npm run dev`.
 *
 * En production, Netlify route `/api/search` vers `netlify/functions/search.ts`.
 * Vite ne sait pas faire ça : sans ce plugin, la requête retombe sur le fallback
 * SPA et l'app bascule en mode « coller un lien » — ce qui donne l'impression
 * que la recherche est cassée alors qu'elle marcherait une fois déployée.
 *
 * Ce plugin traduit la requête Node en `Request` web, appelle le handler, puis
 * réécrit la `Response` : le même code tourne donc en dev et en prod.
 *
 * (Ce fichier vit hors de `netlify/functions/` — tout `.ts` placé là-bas serait
 * déployé comme une fonction serverless.)
 */
export function netlifyDev(): Plugin {
  return {
    name: 'karomy:netlify-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/search', (req, res) => {
        void (async () => {
          try {
            // Import à chaud : modifier la fonction ne demande pas de redémarrage.
            const mod = await server.ssrLoadModule('/netlify/functions/search.ts')
            const handler = mod.default as (request: Request) => Promise<Response>

            const query = new URL(req.url ?? '/', 'http://localhost').search
            const response = await handler(
              new Request(`http://localhost/api/search${query}`, { method: req.method }),
            )

            res.statusCode = response.status
            response.headers.forEach((value, key) => res.setHeader(key, value))
            res.end(await response.text())
          } catch (error) {
            console.error('[karomy] /api/search a échoué en local', error)
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Erreur de la fonction locale' }))
          }
        })()
      })
    },
  }
}
