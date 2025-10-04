#!/usr/bin/env node

/**
 * Security Test Suite for AGW Wallet Authentication
 * Tests all critical security validations
 */

const BASE_URL = 'http://localhost:3001'

async function getNonce() {
  const res = await fetch(`${BASE_URL}/api/auth/nonce`)
  const data = await res.json()
  return data.nonce
}

async function testChainMismatch() {
  console.log('\n🔒 Test 1: Chain ID Mismatch')
  const nonce = await getNonce()

  const message = JSON.stringify({
    domain: 'localhost:3001',
    statement: 'Sign to verify your Abstract Global Wallet.',
    nonce,
    issuedAt: new Date().toISOString(),
  })

  const res = await fetch(`${BASE_URL}/api/auth/wallet-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      signature: '0x1234567890abcdef', // Dummy sig
      walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02',
      chainId: 1 // WRONG: Ethereum mainnet instead of Abstract (2741)
    })
  })

  const data = await res.json()

  if (res.status === 400 && data.error?.includes('Chain mismatch')) {
    console.log('✅ PASS: Chain mismatch rejected')
    console.log(`   Response: ${res.status} - ${data.error}`)
  } else {
    console.log('❌ FAIL: Should reject chain mismatch')
    console.log(`   Got: ${res.status} - ${JSON.stringify(data)}`)
  }
}

async function testMissingChainId() {
  console.log('\n🔒 Test 2: Missing Chain ID')
  const nonce = await getNonce()

  const message = JSON.stringify({
    domain: 'localhost:3001',
    statement: 'Sign to verify your Abstract Global Wallet.',
    nonce,
    issuedAt: new Date().toISOString(),
  })

  const res = await fetch(`${BASE_URL}/api/auth/wallet-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      signature: '0x1234567890abcdef',
      walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02',
      // chainId missing!
    })
  })

  const data = await res.json()

  if (res.status === 400 && data.error?.includes('Chain ID is required')) {
    console.log('✅ PASS: Missing chain ID rejected')
    console.log(`   Response: ${res.status} - ${data.error}`)
  } else {
    console.log('❌ FAIL: Should reject missing chain ID')
    console.log(`   Got: ${res.status} - ${JSON.stringify(data)}`)
  }
}

async function testDomainMismatch() {
  console.log('\n🔒 Test 3: Domain Mismatch (Phishing Protection)')
  const nonce = await getNonce()

  const message = JSON.stringify({
    domain: 'evil-phishing-site.com', // WRONG domain
    statement: 'Sign to verify your Abstract Global Wallet.',
    nonce,
    issuedAt: new Date().toISOString(),
  })

  const res = await fetch(`${BASE_URL}/api/auth/wallet-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      signature: '0x1234567890abcdef',
      walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02',
      chainId: 2741
    })
  })

  const data = await res.json()

  if (res.status === 401 && data.error?.includes('Invalid domain')) {
    console.log('✅ PASS: Domain mismatch rejected (phishing prevented)')
    console.log(`   Response: ${res.status} - ${data.error}`)
  } else {
    console.log('❌ FAIL: Should reject domain mismatch')
    console.log(`   Got: ${res.status} - ${JSON.stringify(data)}`)
  }
}

async function testExpiredTimestamp() {
  console.log('\n🔒 Test 4: Expired Timestamp (>10 minutes old)')
  const nonce = await getNonce()

  // Create timestamp from 15 minutes ago
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const message = JSON.stringify({
    domain: 'localhost:3001',
    statement: 'Sign to verify your Abstract Global Wallet.',
    nonce,
    issuedAt: fifteenMinutesAgo, // EXPIRED
  })

  const res = await fetch(`${BASE_URL}/api/auth/wallet-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      signature: '0x1234567890abcdef',
      walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02',
      chainId: 2741
    })
  })

  const data = await res.json()

  if (res.status === 401 && data.error?.includes('timestamp')) {
    console.log('✅ PASS: Expired timestamp rejected')
    console.log(`   Response: ${res.status} - ${data.error}`)
  } else {
    console.log('❌ FAIL: Should reject expired timestamp')
    console.log(`   Got: ${res.status} - ${JSON.stringify(data)}`)
  }
}

async function testInvalidNonce() {
  console.log('\n🔒 Test 5: Invalid Nonce')

  const message = JSON.stringify({
    domain: 'localhost:3001',
    statement: 'Sign to verify your Abstract Global Wallet.',
    nonce: 'completely-fake-nonce-12345', // INVALID nonce
    issuedAt: new Date().toISOString(),
  })

  const res = await fetch(`${BASE_URL}/api/auth/wallet-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      signature: '0x1234567890abcdef',
      walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02',
      chainId: 2741
    })
  })

  const data = await res.json()

  if (res.status === 401 && data.error?.includes('Invalid nonce')) {
    console.log('✅ PASS: Invalid nonce rejected')
    console.log(`   Response: ${res.status} - ${data.error}`)
  } else {
    console.log('❌ FAIL: Should reject invalid nonce')
    console.log(`   Got: ${res.status} - ${JSON.stringify(data)}`)
  }
}

async function runTests() {
  console.log('🛡️  AGW Authentication Security Test Suite')
  console.log('==========================================')

  try {
    await testChainMismatch()
    await testMissingChainId()
    await testDomainMismatch()
    await testExpiredTimestamp()
    await testInvalidNonce()

    console.log('\n✨ Security tests completed!')
    console.log('\nNote: Nonce replay attack test requires manual testing')
    console.log('(Use the same nonce twice by signing in the UI)')
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message)
  }
}

runTests()
