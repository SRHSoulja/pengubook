import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    content: 'Hello from PenguBook API!',
    timestamp: new Date().toISOString(),
    status: 'working'
  })
}