const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('./dist/lib/websocket/server')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(server)
  console.log('WebSocket server initialized')

  // Make WebSocket server available globally
  global.wsServer = wsServer

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready`)
  })
})