import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './views/Home'
import { RoomView } from './views/RoomView'
import { PhoneView } from './views/PhoneView'
import { Screen } from './components/Screen'
import { isConfigured } from './lib/supabase'

export default function App() {
  if (!isConfigured) return <SetupScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* L'écran partagé : télé, vidéoprojecteur, laptop */}
        <Route path="/room/:code" element={<RoomView />} />
        {/* La vue téléphone — URL courte car elle passe dans le QR code */}
        <Route path="/j/:code" element={<PhoneView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

/** Affiché tant que les variables Supabase ne sont pas renseignées. */
function SetupScreen() {
  return (
    <Screen>
      <h1 style={{ fontSize: '1.6rem', color: 'var(--walnut)' }}>Presque prêt&nbsp;!</h1>
      <p style={{ maxWidth: 460, fontWeight: 600, lineHeight: 1.6 }}>
        Karomy a besoin d'un projet Supabase. Copiez <code>.env.example</code> vers{' '}
        <code>.env</code>, renseignez <code>VITE_SUPABASE_URL</code> et{' '}
        <code>VITE_SUPABASE_ANON_KEY</code>, puis relancez le serveur de dev.
      </p>
      <p className="faint" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Les détails sont dans le README.
      </p>
    </Screen>
  )
}
