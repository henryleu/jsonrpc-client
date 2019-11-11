/*
 * Created by Henry Leu (henryleu@126.com) on 2019/9/26
 */

const net = require('net')
const MinReconnTs = 200 // default min reconnect time span: 200 milliseconds
const MaxReconnTs = 600000 // default max reconnect time span: 600 seconds
const Jitter = 1.2

class DurableSocket extends net.Socket {
  constructor (options) {
    super(options)
    const me = this
    const o = Object.assign({}, options)
    me._o = o
    me.minTs = o.minTs || MinReconnTs
    me.maxTs = o.maxTs || MaxReconnTs
    me.jitter = o.jitter || Jitter
    me._reconnTs = me.minTs
    me._setReconnect = false
    me._reconnTimeout = null
    me._disconnecting = false
    me._reconnTimes = 0
    me._closedOn = Date.now()
    this.on('connect', function () {
      if (!me._setReconnect) return
      me.emit('reconnect', me._reconnTimes++)
      /*
       * prevent reconnecting too frequently once the server side ends
       * the connected socket immediately
       */
      const ts = me._closedOn - Date.now()
      if (ts > me.minTs) {
        me._reconnTs = me.minTs
      }
    })
    this.on('close', function (hadError) {
      if (!me._setReconnect) return
      me._disconnecting = false
      me._closedOn = Date.now()
      me._reconnect(hadError)
    })
  }

  connect (...args) {
    this._setReconnect = false
    super.connect(...args)
  }

  reconnect (options, cb) {
    Object.assign(this._o, options)
    this._setReconnect = true
    this._reconnTs = this.minTs
    this._doReconnect(this._o, cb)
  }

  disconnect (cb) {
    this._setReconnect = false
    this._disconnecting = true
    this._reconnTimeout && clearTimeout(this._reconnTimeout)
    this._reconnTimeout = null
    cb && this.once('close', cb)
    this.end()
  }

  _reconnect () {
    if (this._reconnTimeout || this._disconnecting) return
    const me = this
    me._reconnTimeout = setTimeout(() => me._doReconnect(me._o), me._reconnTs)
    const ts = Math.floor(me._reconnTs * me.jitter)
    me._reconnTs = ts > me.maxTs ? me.maxTs : ts
  }

  _doReconnect (...args) {
    this._reconnTimeout = null
    super.connect(...args)
  }
}

module.exports = DurableSocket
