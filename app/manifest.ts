import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'bubob finance',
    short_name: 'bubob',
    description: 'Catat uang masuk & keluar',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f6fb',
    theme_color: '#0b1c2d',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
