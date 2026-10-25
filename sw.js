var CACHE_NOME = "kitchen-wall-v4";
var FILE_DA_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./data/menu.json",
  "./data/recipes.json",
  "./data/foods.json",
  "./data/shopping.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NOME).then(function (cache) {
      return cache.addAll(FILE_DA_CACHE);
    }).catch(function (err) {
      console.warn("Service worker: errore cache iniziale", err);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (nomi) {
      return Promise.all(nomi.map(function (nome) {
        if (nome !== CACHE_NOME) {
          return caches.delete(nome);
        }
      }));
    })
  );
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.pathname.indexOf("/api/") !== -1) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (risposta) {
      if (risposta) return risposta;
      return fetch(event.request).catch(function () {
        return risposta;
      });
    })
  );
});
