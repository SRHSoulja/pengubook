import { NextRequest, NextResponse } from 'next/server'
import { initializeWebSocket } from '@/lib/websocket/init'

export async function GET(request: NextRequest) {
  try {
    // Initialize WebSocket server
    const wsServer = initializeWebSocket()

    return NextResponse.json({
      success: true,
      message: 'WebSocket server initialized',
      isOnline: wsServer ? true : false
    })
  } catch (error: any) {
    console.error('Failed to initialize WebSocket server:', error)
    return NextResponse.json(
      { error: 'Failed to initialize WebSocket server', details: error.message },
      { status: 500 }
    )
  }
}