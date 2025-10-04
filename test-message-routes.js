#!/usr/bin/env node

/**
 * Test the fixed message edit/delete routes
 * Verifies that /api/messages/message/[messageId] is accessible
 */

const BASE_URL = 'http://localhost:3001'

async function testMessageEditRoute() {
  console.log('\n📝 Testing Message Edit Route')
  console.log('Route: PATCH /api/messages/message/[messageId]')

  // Try to edit a non-existent message (should get 401 or 404, not routing error)
  const res = await fetch(`${BASE_URL}/api/messages/message/test-message-id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Updated message'
    })
  })

  const data = await res.json()

  // We expect 401 (unauthorized) or 404 (not found), NOT a routing/compile error
  if (res.status === 401 || res.status === 404) {
    console.log(`✅ Route exists and responds (${res.status})`)
    console.log(`   Message: ${data.error || JSON.stringify(data)}`)
  } else if (res.status === 500) {
    console.log(`⚠️  Route exists but server error: ${data.error}`)
  } else {
    console.log(`❌ Unexpected response: ${res.status}`)
    console.log(`   ${JSON.stringify(data)}`)
  }
}

async function testMessageDeleteRoute() {
  console.log('\n🗑️  Testing Message Delete Route')
  console.log('Route: DELETE /api/messages/message/[messageId]')

  const res = await fetch(`${BASE_URL}/api/messages/message/test-message-id`, {
    method: 'DELETE',
  })

  const data = await res.json()

  if (res.status === 401 || res.status === 404) {
    console.log(`✅ Route exists and responds (${res.status})`)
    console.log(`   Message: ${data.error || JSON.stringify(data)}`)
  } else if (res.status === 500) {
    console.log(`⚠️  Route exists but server error: ${data.error}`)
  } else {
    console.log(`❌ Unexpected response: ${res.status}`)
    console.log(`   ${JSON.stringify(data)}`)
  }
}

async function testOldRouteGone() {
  console.log('\n🚫 Verifying Old Conflicting Route is Gone')
  console.log('Old route: /api/messages/[messageId] (should NOT exist)')

  // This should fail with 404 or route not found
  const res = await fetch(`${BASE_URL}/api/messages/test-id-at-wrong-level`, {
    method: 'DELETE',
  })

  if (res.status === 404) {
    console.log('✅ Old route correctly removed (404)')
  } else {
    console.log(`⚠️  Got response: ${res.status} - may need verification`)
  }
}

async function runTests() {
  console.log('📬 Message Routes Test Suite')
  console.log('============================')
  console.log('Testing routes after fixing conflict:')
  console.log('  [conversationId] vs [messageId] → message/[messageId]')

  try {
    await testMessageEditRoute()
    await testMessageDeleteRoute()
    await testOldRouteGone()

    console.log('\n✨ Route tests completed!')
    console.log('\nNext: Manual test in UI:')
    console.log('  1. Go to /messages')
    console.log('  2. Send a message')
    console.log('  3. Try to edit it (3-dot menu)')
    console.log('  4. Try to delete it')
  } catch (error) {
    console.error('\n❌ Test error:', error.message)
  }
}

runTests()
