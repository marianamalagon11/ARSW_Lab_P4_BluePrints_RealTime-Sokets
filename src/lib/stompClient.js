import { Client } from '@stomp/stompjs'
// import SockJS from 'sockjs-client' // si quieres fallback

// El backend expone http://host:8080, pero el WebSocket nativo necesita ws:// (o wss://).
function toWsUrl(baseUrl) {
  return `${baseUrl.replace(/\/$/, '').replace(/^http/, 'ws')}/ws-blueprints`
}

export function createStompClient(baseUrl) {
  const client = new Client({
    brokerURL: toWsUrl(baseUrl),
    // webSocketFactory: () => new SockJS(`${baseUrl}/ws-blueprints`),
    reconnectDelay: 1000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onStompError: (f) => console.error('[STOMP] error', f.headers['message']),
  })
  return client
}

// Puntos dibujados en un plano
export function blueprintTopic(author, name) {
  return `/topic/blueprints.${author}.${name}`
}

// Cambios del CRUD (created / updated / deleted) en los planos de un autor; los publica el backend
export function authorTopic(author) {
  return `/topic/authors.${author}`
}

// Devuelve una función para cancelar la suscripción.
export function subscribeTopic(client, topic, onMsg) {
  console.info('[STOMP] suscrito a', topic)
  const sub = client.subscribe(topic, (m) => onMsg(JSON.parse(m.body)))
  return () => {
    console.info('[STOMP] desuscrito de', topic)
    // Si la conexión ya se cayó no hay nada que cancelar en el servidor
    if (client.connected) sub.unsubscribe()
  }
}

export function publishPoint(client, author, name, point) {
  client.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
}
