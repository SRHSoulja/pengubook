import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    content: 'Hello from PeBloq API!',
    timestamp: new Date().toISOString(),
    status: 'working'
  })
}