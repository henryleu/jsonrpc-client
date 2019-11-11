const events = require('events')
const tls = require('tls')
const readline = require('readline')
const json = require('jsonrpc-lite')
const DurableSocket = require('./durable')
const random = (low, high) => Math.floor(Math.random() * (high - low) + low)
const getId = () => '' + (Date.now() * 100000 + random(0, 100000))
const newTimeout = id => json.error(id, new json.JsonRpcError('timeout', 11))
const Timeout = 2000 // default timeout of invocations at client-level

class JsonRpcClient extends events.EventEmitter {
  constructor (options) {
    super()
    this._o = Object.assign({}, options)
    this._o.timeout = options.timeout || Timeout
    const tlsEnabled = (this._o.tlsEnabled =
      options.cert || options.key || options.ca)

    this.invokeMap = new Map()
    this.socket = new DurableSocket(this._o)
    this.socket.on('close', () => {
      this.connected = false
      this.secureConnected = false
    })
    this.socket.on('error', err => this.emit('error', err))
    this.socket.on('connect', () => {
      this.connected = true
      if (!tlsEnabled) {
        readline
          .createInterface({ input: this.socket, crlfDelay: Infinity })
          .on('line', line => this._onResponse(line))
      } else {
        this._tlsConnect().catch(err => this.emit('error', err))
      }
    })
  }

  async connect (cb) {
    if (cb) {
      this.socket.reconnect(this._o, () => {
        this.connected = true
        if (!this._o.tlsEnabled) {
          cb()
          return
        }
        this.tlsSocket.once('secureConnect', () => {
          this.secureConnected = true
          cb()
        })
      })
    } else {
      await new Promise(resolve =>
        this.socket.reconnect(this._o, () => {
          this.connected = true
          resolve()
        })
      )
      if (!this._o.tlsEnabled) return
      await new Promise(resolve => {
        this.tlsSocket.once('secureConnect', () => {
          this.secureConnected = true
          resolve()
        })
      })
    } // end else
  }

  disconnect (cb) {
    if (cb) {
      this.socket.disconnect(() => {
        this.connected = false
        cb()
      })
    } else {
      return new Promise(resolve =>
        this.socket.disconnect(() => {
          this.connected = false
          resolve()
        })
      )
    }
  }

  async invoke (name, input, options) {
    const timeout = (options && options.timeout) || this._o.timeout
    const rid = getId()
    const req = json.request(rid, name, input)
    this.wireWrite(JSON.stringify(req) + '\n')
    this.invokeMap.set(rid, true)
    const me = this
    return new Promise(resolve => {
      // resolve either timeout output
      let timeoutId = setTimeout(() => {
        timeoutId = null
        if (me.invokeMap.delete(rid)) {
          resolve(newTimeout(rid))
        }
      }, timeout)

      // or normally responded output
      me.once(rid, resp => {
        if (me.invokeMap.delete(rid)) {
          clearTimeout(timeoutId)
          timeoutId = null
          resolve(resp)
        }
      })
    })
  }

  _fixTlsConnect () {
    const listeners = this.socket.listeners('error')
    const len = listeners.length
    for (let i = 1; i < len; i++) {
      this.socket.off('error', listeners[i])
    }
  }

  _tlsConnect () {
    const options = {}
    const o = this._o
    o.cert && (options.cert = o.cert)
    o.key && (options.key = o.key)
    o.ca && (options.ca = o.ca)
    options.socket = this.socket
    return new Promise((resolve, reject) => {
      let resolved = false
      this._fixTlsConnect()
      this.tlsSocket = tls.connect(options)
      this.tlsSocket.once('secureConnect', () => {
        this.secureConnected = true
        readline
          .createInterface({ input: this.tlsSocket, crlfDelay: Infinity })
          .on('line', line => this._onResponse(line))
        if (!resolved) {
          resolved = true
          resolve()
        }
      })

      this.tlsSocket.on('error', err => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })
    })
  }

  wireWrite (...args) {
    if (this._o.tlsEnabled) {
      return this.tlsSocket.write(...args)
    } else {
      return this.socket.write(...args)
    }
  }

  _onResponse (line) {
    const me = this
    let parsed = json.parse(line)
    parsed = Array.isArray(parsed) ? parsed : [parsed]
    for (const obj of parsed) {
      switch (obj.type) {
        case 'success':
        case 'error':
          me.emit(obj.payload.id, obj.payload)
          break
        case 'invalid':
          console.log('jsonrpc client - invalid:', JSON.stringify(obj.payload))
          break
        default:
          console.log('jsonrpc client - ignore:', JSON.stringify(obj.payload))
      }
    }
  }
}

module.exports = JsonRpcClient
