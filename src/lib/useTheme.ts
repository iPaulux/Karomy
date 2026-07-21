import { useEffect } from 'react'
import type { RoomTheme } from './types'

/**
 * Pose le thème de la room sur `<html data-theme="…">`.
 *
 * Passer par l'élément racine plutôt que par un conteneur React permet aux
 * variables CSS de couvrir aussi ce qui échappe à l'arbre : fond du body,
 * barre de scroll, et la couleur d'interface du navigateur mobile.
 */
export function useTheme(theme: RoomTheme | undefined): void {
  useEffect(() => {
    if (!theme || theme === 'normal') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = theme
    }

    // La barre d'adresse mobile suit `theme-color` : sans ça, elle resterait
    // crème au milieu d'une interface devenue rose.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'birthday' ? '#fff5f7' : '#fdf6e9'

    return () => {
      delete document.documentElement.dataset.theme
      if (meta) meta.content = '#fdf6e9'
    }
  }, [theme])
}
