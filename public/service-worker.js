const CACHE_NAME = "bursglove-pos-v1";
const urlsToCache = ["/", "/index.html", "/manifest.json"];

// ✅ Instalar Service Worker y guardar archivos básicos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Archivos cacheados correctamente");
      return cache.addAll(urlsToCache);
    })
  );
});

// ✅ Activar y limpiar versiones viejas del caché
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  console.log("🚀 Service Worker activado");
});

// ✅ Interceptar solicitudes para funcionar offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si existe en caché, servirlo; si no, buscarlo online
      return (
        response ||
        fetch(event.request).catch(() => {
          // Si estás offline y la solicitud falla
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        })
      );
    })
  );
});
