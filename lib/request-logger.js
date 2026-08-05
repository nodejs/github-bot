import { randomUUID } from 'node:crypto'

function obscureHeaders (headers) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [
    name,
    name === 'x-hub-signature' ? null : value
  ]))
}

function requestSerializer (req) {
  return {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: obscureHeaders(req.headers),
    query: req.query,
    remoteAddress: req.socket.remoteAddress,
    remotePort: req.socket.remotePort
  }
}

export default function requestLogger (logger) {
  const parentLogger = logger.child({
    serializers: {
      req: requestSerializer,
      res: logger.constructor.stdSerializers.res
    }
  })

  return function logRequest (req, res, next) {
    const requestId = req.reqId || req.headers['x-request-id'] || randomUUID()
    const start = process.hrtime.bigint()

    req.log = res.log = parentLogger.child({ req_id: requestId }, true)
    req.reqId = res.reqId = requestId
    res.setHeader('X-Request-Id', requestId)

    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e6
      req.log.trace({ req, res, duration }, 'request finish')
    })

    next()
  }
}
