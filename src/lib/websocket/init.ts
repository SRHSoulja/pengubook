import { WebSocketServer } from './server'
import { createServer } from 'http'

let wsServer: WebSocketServer | null = null

export function initializeWebSocket(httpServer?: any) {
  if (!wsServer) {
    // Create HTTP server if not provided (for development)
    const server = httpServer || createServer()

    // Start the HTTP server on port 3002 for WebSocket if no server provided
    if (!httpServer) {
      const port = process.env.WS_PORT || 3002
      server.listen(port, () => {
        console.log(`WebSocket HTTP server listening on port ${port}`)
      })
    }

    wsServer = new WebSocketServer(server)
    console.log('WebSocket server initialized')
  }

  return wsServer
}

export function getWebSocketServer() {
  return wsServer
}