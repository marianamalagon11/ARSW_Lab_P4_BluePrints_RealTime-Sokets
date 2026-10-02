import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

export async function login(username, password) {
  const { data } = await axios.post(`${API_BASE}/auth/login`, { username, password })
  localStorage.setItem('token', data.access_token)
  return data
}

export function logout() {
  localStorage.removeItem('token')
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem('token'))
}
