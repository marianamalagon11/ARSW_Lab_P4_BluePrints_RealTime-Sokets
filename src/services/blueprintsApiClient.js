import api from './apiClient.js'

// El backend envuelve toda respuesta en { code, message, data }.
function unwrap(request) {
  return request.then(({ data }) => data.data)
}

export function getAll() {
  return unwrap(api.get('/blueprints'))
}

export function getByAuthor(author) {
  return unwrap(api.get(`/blueprints/${encodeURIComponent(author)}`))
}

export function getByAuthorAndName(author, name) {
  return unwrap(api.get(`/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`))
}

export function create(payload) {
  // El backend no devuelve el blueprint creado (data: null), devolvemos el
  // payload para que quien llame pueda actualizar su estado local.
  return api.post('/blueprints', payload).then(() => payload)
}

export function update(author, name, points) {
  return api
    .put(`/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`, { points })
    .then(() => ({ author, name, points }))
}

export function remove(author, name) {
  return api
    .delete(`/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`)
    .then(() => ({ author, name }))
}
