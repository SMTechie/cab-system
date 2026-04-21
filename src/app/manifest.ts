import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CabFlow',
    short_name: 'CabFlow',
    description: 'Real-time ride dispatch, tracking, and payments.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#04080f',
    theme_color: '#12c2b9',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png'
      },
      {
        src: '/apple-icon',
        sizes: 'any',
        type: 'image/png'
      }
    ]
  };
}
