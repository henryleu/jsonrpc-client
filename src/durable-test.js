/*
 * Created by Henry Leu (henryleu@126.com) on 2019/9/26
 */
const net = require('net')
const DurableConnection = require('./durable')
const port = 40701
const host = '127.0.0.1'
const random = (low, high) => Math.random() * (high - low) + low
function exitHandler (options, exitCode) {
  if (options.cleanup) console.log('clean')
  if (exitCode || exitCode === 0) console.log(exitCode)
  if (options.exit) process.exit()
}

function test () {
  const server = net.createServer(c => {
    console.log('socket is connected')
    c.on('data', data => console.log(data.toString()))
    c.on('end', () => {
      console.log('socket is ended')
    })
    c.pipe(c)

    const timeout = Math.floor(random(1000, 5000))
    console.log('server ends after', timeout)
    setTimeout(function () {
      console.log('socket is ending')
      c.end()
    }, timeout)
  })
  server.on('error', function (err) {
    console.error(err)
  })
  server.listen(port, host, () => {
    console.log('server is listening')
  })
  setTimeout(function () {
    console.log('server is closing')
    server.close(() => console.log('server is closed'))
  }, 10000)

  const socket = new DurableConnection({
    minTs: 300,
    maxTs: 10000
  })
  socket.reconnect({ port, host }, () => {
    console.log('client is connected for the first time')
  })
  socket.on('reconnect', times => console.log('\nreconnect', times, 'times'))
  socket.on('ready', () => {
    console.log('client is ready')
    const timeout = Math.floor(random(1000, 5000))
    console.log('client ends after', timeout)
    setTimeout(function () {
      console.log('client is ending')
      socket.end()
    }, timeout)
  })
  socket.on('data', data => console.log(data.toString()))
  socket.on('end', () => console.log('client is ended'))
  socket.on('close', () => console.log('client is closed\n'))
  socket.on('error', err => console.log('client error -', err))
  setTimeout(function () {
    console.log('client is disconnecting')
    socket.disconnect(() => console.log('client is disconnected'))
    setTimeout(() => console.log(socket._setReconnect), 1000)
  }, 15000)

  process.stdin.resume() // so the program will not close instantly
  // do something when app is closing
  process.on('exit', exitHandler.bind(null, { cleanup: true }))
  // catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, { exit: true }))
  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
  process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
  // catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
}

test()
setInterval(function () {
  console.log('bye...')
}, 1000 * 60 * 60)
