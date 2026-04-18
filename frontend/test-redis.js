const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

// Step 1: Verify credentials work via REST API
async function testRest() {
  const url = 'https://joint-spaniel-70722.upstash.io'
  const token = process.env.REDIS_PASSWORD
  
  console.log('=== Step 1: Testing REST API credentials ===')
  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    console.log('REST API response:', JSON.stringify(data))
    if (data.result === 'PONG') {
      console.log('✅ Credentials are VALID!\n')
    } else {
      console.log('❌ Unexpected response\n')
    }
  } catch (e) {
    console.log('❌ REST API failed:', e.message, '\n')
  }
}

// Step 2: Try common Upstash ports
async function testPorts() {
  const Redis = require('ioredis')
  const host = process.env.REDIS_HOST
  const password = process.env.REDIS_PASSWORD
  const portsToTry = [6379, 36379, 33404, 30722]
  
  console.log('=== Step 2: Trying different ports with TLS ===')
  
  for (const port of portsToTry) {
    console.log(`\nTrying port ${port}...`)
    const result = await new Promise((resolve) => {
      const redis = new Redis({
        host,
        port,
        password,
        tls: {},
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
      })
      
      const timeout = setTimeout(() => {
        redis.disconnect()
        resolve(`port ${port}: TIMEOUT`)
      }, 6000)
      
      redis.connect().then(() => {
        return redis.ping()
      }).then((pong) => {
        clearTimeout(timeout)
        console.log(`✅ Port ${port} WORKS! PING = ${pong}`)
        redis.disconnect()
        resolve(`port ${port}: SUCCESS`)
      }).catch((err) => {
        clearTimeout(timeout)
        console.log(`❌ Port ${port}: ${err.message}`)
        redis.disconnect()
        resolve(`port ${port}: ${err.message}`)
      })
    })
    
    if (result.includes('SUCCESS')) {
      console.log(`\n🎉 USE THIS IN .env.local: REDIS_PORT=${port}`)
      process.exit(0)
    }
  }
  
  console.log('\n❌ None of the common ports worked.')
  console.log('→ Go to https://console.upstash.com, click your database,')
  console.log('  and look for "Endpoint" - it shows host:PORT.')
  console.log('  Update REDIS_PORT in .env.local with that port number.')
}

testRest().then(() => testPorts())
