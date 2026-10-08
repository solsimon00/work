// Service worker de "¿Con qué pago?": muestra las alertas push y abre la app al tocarlas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || "¿Con qué pago?", {
    body: data.body || "Mirá las promos de hoy.",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: data.tag || "promos-del-dia",
    data: { url: data.url || "./#hoy" },
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const abierta = tabs.find(t => t.url.startsWith(self.registration.scope));
    if (abierta) { await abierta.navigate(url); return abierta.focus(); }
    return self.clients.openWindow(url);
  })());
});
