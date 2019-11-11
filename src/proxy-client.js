const JsonRpcClient = require('./jsonrpc-client')
const MethodMultiply = 'AdminServiceRFC.Multiply'
const MethodConfig = 'AdminServiceRFC.UpdateTunnelsConfig'
const getOutput = resp => {
  const ret = {}
  resp.result && (ret.result = resp.result)
  resp.error && (ret.error = resp.error)
  return ret
}

class ProxyClient extends JsonRpcClient {
  constructor (options) {
    super(options)
    this.options = Object.assign({}, options)
    this.socket.on('close', () => (this.connected = false))
  }

  async multiply (x, y, options) {
    const resp = await this.invoke(MethodMultiply, { x, y }, options)
    return getOutput(resp)
  }

  async updateTunnelsConfig (config, options) {
    const resp = await this.invoke(MethodConfig, config, options)
    return getOutput(resp)
  }
}

module.exports = ProxyClient
