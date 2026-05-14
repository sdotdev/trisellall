import { createServer } from 'node:http'

const startedAt = Date.now()
let lastTickAt: string | null = null

export function recordTick(): void {
  lastTickAt = new Date().toISOString()
}

export function startHealthServer(port = 3001): void {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        lastTick: lastTickAt,
      }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  server.listen(port, () => {
    console.log(`${new Date().toISOString()} [health] Listening on :${port}`)
  })
}
