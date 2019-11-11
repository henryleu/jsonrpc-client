const net = require('net')
const JsonRpcClient = require('./jsonrpc-client')
const jsonrpc = require('jsonrpc-lite')
const readline = require('readline')
const port = 40734
const host = '127.0.0.1'
const client = new JsonRpcClient({
  port,
  host,
  minTs: 500,
  maxTs: 10000
})
const waitFor = t => new Promise(resolve => setTimeout(resolve, t))
let mid = 0
const serverHandle = socket => {
  readline
    .createInterface({
      input: socket,
      crlfDelay: Infinity
    })
    .on('line', line => {
      const parsed = jsonrpc.parse(line)
      switch (parsed.type) {
        case 'request':
          if (parsed.payload.method !== 'AdminServiceRFC.Multiply') {
            return
          }
          if (++mid % 2 === 0) {
            socket.write(
              JSON.stringify(
                jsonrpc.error(
                  parsed.payload.id,
                  new jsonrpc.JsonRpcError('service internal error', 500)
                )
              ) + '\n'
            )
          } else {
            socket.write(
              JSON.stringify(
                jsonrpc.success(parsed.payload.id, { result: 240 })
              ) + '\n'
            )
          }
          break
        case 'notification':
          console.log('jsonrpc server - notification', JSON.stringify(parsed))
          break
        case 'success':
        case 'error':
          console.log(
            'jsonrpc server - ignore success and error',
            JSON.stringify(parsed.payload)
          )
          break
        case 'invalid':
          console.log(
            'jsonrpc server - invalid request',
            JSON.stringify(parsed.payload)
          )
          break
        default:
          console.log('jsonrpc server - illegal type', JSON.stringify(parsed))
      }
    })
}

async function testConnectAndDisconnect () {
  const server = net.createServer(c => {
    console.log('socket is connected')
    c.on('data', data => console.log(data.toString()))
    c.on('end', () => console.log('socket is ended'))
    c.pipe(c)
  })
  server.on('error', err => console.error(err))
  server.listen(port, host, () => console.log('server is listening'))
  setTimeout(() => server.close(() => console.log('server is closed')), 1000)

  console.log('====== connect and disconnect')
  await client.connect()
  console.log('connected', client.connected)
  await waitFor(10)
  await client.disconnect()
  console.log('connected', client.connected)

  console.log('====== connect and disconnect')
  await client.connect()
  console.log('connected', client.connected)
  await client.disconnect()
  console.log('connected', client.connected)

  console.log('====== connect and disconnect')
  client.connect(() => console.log('connected', client.connected))
  client.disconnect(() => console.log('connected', client.connected))
  await waitFor(1000)
}

async function testRequestAndResponse () {
  const server = net.createServer(c => {
    console.log('socket is connected')
    serverHandle(c)
    c.on('end', () => console.log('socket is ended'))
  })
  server.on('error', err => console.error(err))
  server.listen(port, host, () => console.log('server is listening'))
  setTimeout(() => server.close(() => console.log('server is closed')), 5000)

  console.log('====== request and response')
  await client.connect()
  console.log('client is connected')
  let resp
  let name = 'AdminServiceRFC.Multiply'
  let req = { X: 20, y: 12 }
  resp = await client.invoke(name, req)
  console.log(JSON.stringify(resp))

  name = 'AdminServiceRFC.Multiply'
  req = { X: 40, y: 10 }
  resp = await client.invoke(name, req)
  console.log(JSON.stringify(resp))

  name = 'AdminServiceRFC.Add'
  req = { X: 40, y: 10 }
  resp = await client.invoke(name, req)
  console.log(JSON.stringify(resp))

  await client.disconnect()
  console.log('client is disconnected')
  await client.connect()
  console.log('client is connected')

  name = 'AdminServiceRFC.Multiply'
  req = { X: 40, y: 10 }
  resp = await client.invoke(name, req)
  console.log(JSON.stringify(resp))

  name = 'AdminServiceRFC.Multiply'
  req = { X: 40, y: 10 }
  resp = await client.invoke(name, req)
  console.log(JSON.stringify(resp))

  await client.disconnect()
  console.log('client is disconnected')
}

async function test () {
  await testConnectAndDisconnect()
  await testRequestAndResponse()
}

test()
