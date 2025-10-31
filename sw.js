
const CACHE_NAME = 'toon-nation-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/index.tsx', // The main entry point
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/@google/genai@^1.27.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/client.js',
  'https://aistudiocdn.com/react@^19.2.0',
  // Caching image previews
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/DC_Comic.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Vibrant_Cartoon.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Dragon_Ball_Z.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pencil_Sketch.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Watercolor.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Bronze_Sculpture.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/3D_Render.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Vintage_Cartoon.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pixar-style_3D_Render.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Retro_Anime.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Looney_Tunes.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Disney_Classic.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Claymation.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Comic_Strip.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Stained_Glass.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Marble_Sculpture.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Mosaic_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Cubism.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Impressionism.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pop_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Pixel_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Low_Poly.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Sticker_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Glitch_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Marvel_Comic.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/The_Simpsons.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Studio_Ghibli.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/South_Park.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Tim_Burton_Style.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Futurama_Style.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Classic_Zombie.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Infected_Zombie.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Cartoon_Zombie.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Gothic_Vampire.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Subtle_Animation.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Character_Loop.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Chibi.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Golden_Age_Cartoon.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Graffiti_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Ukiyo-e.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Art_Deco.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Paper_Cutout.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Tribal_Art.png',
  'https://storage.googleapis.com/maker-suite-project-files-prod/ai-studio-colab-notebooks/b5608b4e-e59e-49b3-b18c-ca2b3236398d/assets/toon-me/Hologram.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        const promises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(err => {
                console.warn(`Failed to cache ${urlToCache}:`, err);
            });
        });
        return Promise.all(promises);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            if(!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        ).catch(() => {
          // If the network request fails, you could return a fallback page
          // For now, we just let the browser handle the error.
        });
      })
    );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
