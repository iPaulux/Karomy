import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Vrai si les variables d'environnement Supabase sont renseignées. */
export const isConfigured = Boolean(url && key)

if (!isConfigured) {
  console.warn(
    '[Karomy] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants — ' +
      'copiez .env.example vers .env et renseignez-les.',
  )
}

/**
 * Client Supabase. Si la config manque, on crée quand même un client avec des
 * valeurs bidon : l'app affiche alors un écran de configuration plutôt que de
 * planter au chargement du module.
 */
export const supabase = createClient(url ?? 'http://localhost', key ?? 'anon', {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
})
