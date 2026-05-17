const WebSocket = require('ws')
const http = require('http')
const fs = require('fs')
const path = require('path')
const https = require('https')

const PORT = process.env.PORT || 8080

// ─── Persistent counter (survives redeploys) ──────────────────────────────────

function incrementCounter(callback) {
  https.get('https://countapi.xyz/hit/anon-relay-felix/nodes', (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try { callback(JSON.parse(data).value) }
      catch { callback(null) }
    })
  }).on('error', () => callback(null))
}

function getCounter(callback) {
  https.get('https://countapi.xyz/get/anon-relay-felix/nodes', (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      try { callback(JSON.parse(data).value) }
      catch { callback(0) }
    })
  }).on('error', () => callback(0))
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {

  if (req.url === '/stats') {
    getCounter((total) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ totalNodes: total, activeNodes: nodes.size }))
    })
    return
  }

  const filePath = path.join(__dirname, '../client', req.url === '/' ? 'index.html' : req.url)
  const ext = path.extname(filePath)
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' })
    res.end(data)
  })
})

// ─── WebSocket ────────────────────────────────────────────────────────────────

const wss = new WebSocket.Server({ server })

const nodes = new Map()
const freedIds = []
let nextId = 1
const PING_TIMEOUT = 35000

const assignId = () => freedIds.length > 0 ? freedIds.shift() : String(nextId++)

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

wss.on('connection', (socket) => {
  const id = assignId()
  let kickTimer = null

  nodes.set(id, socket)
  incrementCounter(() => {}) // increment lifetime count, fire and forget
  console.log(`Node ${id} connected. Active: ${nodes.size}`)
  socket.send(JSON.stringify({ type: 'welcome', id }))

  const resetKickTimer = () => {
    clearTimeout(kickTimer)
    kickTimer = setTimeout(() => {
      console.log(`Node ${id} timed out — kicking`)
      socket.close()
    }, PING_TIMEOUT)
  }

  resetKickTimer()

  socket.on('message', (raw) => {
    const msg = JSON.parse(raw)

    if (msg.type === 'ping') {
      resetKickTimer()
      socket.send(JSON.stringify({ type: 'pong' }))
      return
    }

    if (msg.type === 'get_peers') {
      const peers = [...nodes.keys()].filter(nid => nid !== id)
      socket.send(JSON.stringify({ type: 'peers', peers }))
      return
    }

    if (msg.type === 'get_random_peers') {
      const exclude = new Set([id, ...(msg.exclude || [])])
      const available = shuffle([...nodes.keys()].filter(nid => !exclude.has(nid)))
      const hops = available.slice(0, 3)
      socket.send(JSON.stringify({ type: 'random_peers', hops }))
      return
    }

    if (msg.type === 'relay') {
      const target = nodes.get(msg.to)
      if (target) target.send(JSON.stringify({ type: 'relay', from: id, data: msg.data, direct: msg.direct }))
      return
    }
  })

  socket.on('close', () => {
    clearTimeout(kickTimer)
    nodes.delete(id)
    freedIds.push(id)
    console.log(`Node ${id} freed. Pool: [${freedIds}]. Active: ${nodes.size}`)
  })
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Open http://localhost:${PORT} in multiple tabs`)
})