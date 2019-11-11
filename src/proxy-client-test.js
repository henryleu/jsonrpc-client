const fs = require('fs')
const path = require('path')
const Client = require('./proxy-client')
const assert = require('assert').strict

async function testMultiply () {
  const port = 1070
  const host = '127.0.0.1'
  const cert = fs.readFileSync(path.join(__dirname, '../../../certs/lc.pem'))
  const key = fs.readFileSync(path.join(__dirname, '../../../certs/lc.key'))
  const ca = [fs.readFileSync(path.join(__dirname, '../../../certs/ls.pem'))]
  const client = new Client({
    port,
    host,
    minTs: 500,
    maxTs: 10000,
    cert,
    key,
    ca
  })

  console.log('====== request and response')
  await client.connect()
  console.log('client is connected')
  console.log('client.secureConnected', client.secureConnected)
  let resp
  resp = await client.multiply(20, 12)
  console.log(JSON.stringify(resp))
  assert.ok(resp.result, 'should have result')
  assert.ok(!resp.error, 'should have no error')
  assert.equal(resp.result.result, 240, 'result is wrong')

  resp = await client.multiply(40, 12)
  console.log(JSON.stringify(resp))
  assert.ok(resp.result, 'should have result')
  assert.ok(!resp.error, 'should have no error')
  assert.equal(resp.result.result, 480, 'result is wrong')

  await client.disconnect()
  console.log('client is disconnected')

  await client.connect()
  console.log('client is connected')

  resp = await client.multiply(40, 12)
  console.log(JSON.stringify(resp))
  assert.ok(resp.result, 'should have result')
  assert.ok(!resp.error, 'should have no error')
  assert.equal(resp.result.result, 480, 'result is wrong')

  await client.disconnect()
  console.log('client is disconnected')
}

async function testConfig () {
  const port = 1070
  const host = '127.0.0.1'
  const cert = fs.readFileSync(path.join(__dirname, '../../../certs/lc.pem'))
  const key = fs.readFileSync(path.join(__dirname, '../../../certs/lc.key'))
  const ca = [fs.readFileSync(path.join(__dirname, '../../../certs/ls.pem'))]
  const client = new Client({
    port,
    host,
    minTs: 500,
    maxTs: 10000,
    cert,
    key,
    ca
  })

  console.log('====== request and response')
  await client.connect()
  console.log('client is connected')

  const config = {
    tunnels: [
      {
        type: 'ssh-tunnel',
        network: 'tcp',
        address: '34.92.84.158:22',
        username: 'hi',
        password: 'hi',
        connectionNum: 2
      }
    ]
  }

  const resp = await client.updateTunnelsConfig(config)
  console.log(JSON.stringify(resp))
  assert.ok(resp.result, 'should have result')
  assert.ok(!resp.error, 'should have no error')
  assert.equal(resp.result.code, '', 'code is blank')

  await client.disconnect()
  console.log('client is disconnected')
}

async function test () {
  await testMultiply()
  await testConfig()
}

test()
