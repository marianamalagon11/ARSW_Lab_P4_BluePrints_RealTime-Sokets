import { useEffect, useRef, useState } from 'react'
import { createStompClient, subscribeBlueprint, publishPoint } from './lib/stompClient.js'
import { createSocket } from './lib/socketIoClient.js'
import { login, logout, isLoggedIn } from './services/authClient.js'
import * as bpApi from './services/blueprintsApiClient.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080' // Spring (REST + STOMP)
const IO_BASE = import.meta.env.VITE_IO_BASE ?? 'http://localhost:3001' // Node/Socket.IO

const CANVAS_W = 600
const CANVAS_H = 400

// Mensaje legible a partir de un error de axios ({ code, message, data } del backend).
function errorMessage(err) {
  return err.response?.data?.message ?? err.response?.data?.error ?? err.message
}

function LoginForm({ onLogged }) {
  const [username, setUsername] = useState('student')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await login(username, password)
      onLogged()
    } catch (err) {
      setError(err.response?.status === 401 ? 'Usuario o contraseña incorrectos' : errorMessage(err))
    }
  }

  return (
    <form onSubmit={onSubmit} style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Iniciar sesión</h3>
      <div style={styles.row}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="contraseña"
        />
        <button type="submit">Entrar</button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
    </form>
  )
}

export default function App() {
  const [logged, setLogged] = useState(isLoggedIn())
  const [tech, setTech] = useState('stomp')
  const [rtStatus, setRtStatus] = useState('desconectado')

  const [author, setAuthor] = useState('juan')
  const [blueprints, setBlueprints] = useState([])
  const [newName, setNewName] = useState('')

  // Plano abierto en el canvas: { author, name } o null
  const [current, setCurrent] = useState(null)
  const [points, setPoints] = useState([])
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState(null) // { type: 'ok' | 'error', text }

  const canvasRef = useRef(null)
  const stompRef = useRef(null)
  const socketRef = useRef(null)

  const totalPoints = blueprints.reduce((acc, bp) => acc + bp.points.length, 0)

  function showError(err) {
    if (err.response?.status === 401) {
      setLogged(false)
      setNotice({ type: 'error', text: 'La sesión expiró, vuelve a iniciar sesión' })
      return
    }
    setNotice({ type: 'error', text: errorMessage(err) })
  }

  // ---------- REST (CRUD) ----------

  async function loadAuthor(a = author) {
    try {
      const list = await bpApi.getByAuthor(a)
      setBlueprints([...list].sort((x, y) => x.name.localeCompare(y.name)))
    } catch (err) {
      // El backend responde 404 cuando el autor aún no tiene planos
      if (err.response?.status === 404) setBlueprints([])
      else showError(err)
    }
  }

  async function openBlueprint(name) {
    try {
      const bp = await bpApi.getByAuthorAndName(author, name)
      setCurrent({ author: bp.author, name: bp.name })
      setPoints(bp.points)
      setDirty(false)
      setNotice(null)
    } catch (err) {
      showError(err)
    }
  }

  async function onCreate() {
    const name = newName.trim()
    if (!author.trim() || !name) {
      setNotice({ type: 'error', text: 'Escribe autor y nombre del plano' })
      return
    }
    try {
      await bpApi.create({ author, name, points: [] })
      setNewName('')
      await loadAuthor()
      await openBlueprint(name)
      setNotice({ type: 'ok', text: `Plano "${name}" creado` })
    } catch (err) {
      showError(err)
    }
  }

  async function onSave() {
    if (!current) return
    try {
      await bpApi.update(current.author, current.name, points)
      setDirty(false)
      await loadAuthor(current.author)
      setNotice({ type: 'ok', text: `Plano "${current.name}" guardado (${points.length} puntos)` })
    } catch (err) {
      showError(err)
    }
  }

  async function onDelete() {
    if (!current || !window.confirm(`¿Eliminar el plano "${current.name}"?`)) return
    try {
      await bpApi.remove(current.author, current.name)
      setNotice({ type: 'ok', text: `Plano "${current.name}" eliminado` })
      setCurrent(null)
      setPoints([])
      setDirty(false)
      await loadAuthor(current.author)
    } catch (err) {
      showError(err)
    }
  }

  function onLogout() {
    logout()
    setLogged(false)
    setBlueprints([])
    setCurrent(null)
    setPoints([])
  }

  useEffect(() => {
    if (logged) loadAuthor()
    // Solo al iniciar sesión; luego se recarga con el botón "Cargar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged])

  // ---------- Tiempo real ----------

  function appendPoint(point) {
    setPoints((prev) => [...prev, point])
    setDirty(true)
  }

  useEffect(() => {
    if (!current || tech === 'none') {
      setRtStatus('desconectado')
      return
    }
    const { author: a, name: n } = current

    if (tech === 'stomp') {
      const client = createStompClient(API_BASE)
      stompRef.current = client
      let unsubscribe = null
      setRtStatus('conectando...')
      client.onConnect = () => {
        console.info('[STOMP] conectado a', API_BASE)
        setRtStatus('conectado')
        unsubscribe = subscribeBlueprint(client, a, n, (msg) => {
          console.debug('[STOMP] punto recibido', msg.point)
          appendPoint(msg.point)
        })
      }
      client.onWebSocketClose = () => setRtStatus('reconectando...')
      client.activate()
      return () => {
        unsubscribe?.()
        // Cierre intencional: que el evento de cierre no marque "reconectando..."
        client.onWebSocketClose = () => {}
        client.deactivate()
        stompRef.current = null
      }
    }

    // Socket.IO: se deja el cliente del scaffold por si se prueba con el backend Node
    const room = `blueprints.${a}.${n}`
    const s = createSocket(IO_BASE)
    socketRef.current = s
    setRtStatus('conectando...')
    s.on('connect', () => {
      console.info('[Socket.IO] conectado, uniéndose a', room)
      setRtStatus('conectado')
      s.emit('join-room', room)
    })
    s.on('connect_error', () => setRtStatus('sin conexión'))
    s.on('blueprint-update', (upd) => {
      if (upd.point) appendPoint(upd.point)
      else if (upd.points) setPoints(upd.points)
    })
    return () => {
      s.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tech, current])

  function onCanvasClick(e) {
    if (!current) return
    const rect = e.target.getBoundingClientRect()
    const point = { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) }
    const { author: a, name: n } = current

    if (tech === 'stomp' && stompRef.current?.connected) {
      // No se agrega localmente: el broker devuelve el punto a todos los suscritos, incluida esta pestaña
      publishPoint(stompRef.current, a, n, point)
    } else if (tech === 'socketio' && socketRef.current?.connected) {
      socketRef.current.emit('draw-event', { room: `blueprints.${a}.${n}`, author: a, name: n, point })
    } else {
      appendPoint(point)
    }
  }

  // ---------- Canvas ----------

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    ctx.fillStyle = '#1e3a8a'
    points.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })
  }, [points, logged])

  // ---------- UI ----------

  if (!logged) {
    return (
      <div style={styles.page}>
        <h2>BluePrints RT – STOMP</h2>
        {notice && <p style={styles.error}>{notice.text}</p>}
        <LoginForm
          onLogged={() => {
            setNotice(null)
            setLogged(true)
          }}
        />
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.row, justifyContent: 'space-between' }}>
        <h2 style={{ margin: '8px 0' }}>BluePrints RT – STOMP</h2>
        <button onClick={onLogout}>Cerrar sesión</button>
      </div>

      <div style={{ ...styles.row, marginBottom: 12 }}>
        <label>Tiempo real:</label>
        <select value={tech} onChange={(e) => setTech(e.target.value)}>
          <option value="none">None</option>
          <option value="stomp">STOMP (Spring)</option>
          <option value="socketio">Socket.IO (Node)</option>
        </select>
        <span style={{ ...styles.badge, background: rtStatus === 'conectado' ? '#dcfce7' : '#f3f4f6' }}>
          {rtStatus}
        </span>
      </div>

      {notice && <p style={notice.type === 'ok' ? styles.ok : styles.error}>{notice.text}</p>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <section style={{ ...styles.card, width: 280 }}>
          <div style={styles.row}>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="autor" />
            <button onClick={() => loadAuthor()}>Cargar</button>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Plano</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {blueprints.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ ...styles.td, opacity: 0.6 }}>
                    Sin planos para este autor
                  </td>
                </tr>
              )}
              {blueprints.map((bp) => {
                const selected = current?.author === bp.author && current?.name === bp.name
                return (
                  <tr
                    key={bp.name}
                    onClick={() => openBlueprint(bp.name)}
                    style={{ cursor: 'pointer', background: selected ? '#dbeafe' : undefined }}
                  >
                    <td style={styles.td}>{bp.name}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{bp.points.length}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...styles.td, fontWeight: 600 }}>Total</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{totalPoints}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ ...styles.row, marginTop: 12 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="nuevo plano" />
            <button onClick={onCreate}>Create</button>
          </div>
        </section>

        <section>
          <div style={{ ...styles.row, marginBottom: 8 }}>
            <strong>
              {current ? `${current.author} / ${current.name}` : 'Selecciona o crea un plano'}
            </strong>
            {current && (
              <span style={{ opacity: 0.7 }}>
                {points.length} puntos{dirty ? ' · sin guardar' : ''}
              </span>
            )}
            <button onClick={onSave} disabled={!current}>
              Save/Update
            </button>
            <button onClick={onDelete} disabled={!current}>
              Delete
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ ...styles.canvas, cursor: current ? 'crosshair' : 'not-allowed' }}
            onClick={onCanvasClick}
          />
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            Tip: abre 2 pestañas en el mismo plano y dibuja alternando para ver la colaboración.
          </p>
        </section>
      </div>
    </div>
  )
}

const styles = {
  page: { fontFamily: 'Inter, system-ui', padding: 16, maxWidth: 960 },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  card: { border: '1px solid #ddd', borderRadius: 12, padding: 12 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  th: { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '4px 6px' },
  td: { borderBottom: '1px solid #f0f0f0', padding: '4px 6px' },
  canvas: { border: '1px solid #ddd', borderRadius: 12, display: 'block' },
  badge: { padding: '2px 8px', borderRadius: 999, fontSize: 13 },
  ok: { color: '#166534' },
  error: { color: '#b91c1c' },
}
