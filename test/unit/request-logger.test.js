import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import requestLogger from '../../lib/request-logger.js'

class TestLogger {
  static stdSerializers = { res: (res) => res }

  constructor () {
    this.children = []
    this.logs = []
  }

  child (fields) {
    this.children.push(fields)
    return this
  }

  trace (...args) {
    this.logs.push(args)
  }
}

test('adds a request logger and logs the completed request', () => {
  const logger = new TestLogger()
  const middleware = requestLogger(logger)
  const req = {
    method: 'POST',
    url: '/hooks/github',
    headers: {
      'x-hub-signature': 'secret',
      'x-request-id': 'existing-request-id'
    },
    query: {},
    socket: { remoteAddress: '127.0.0.1', remotePort: 1234 }
  }
  const res = new EventEmitter()
  res.setHeader = (name, value) => { res.headers = { [name]: value } }
  let nextCalled = false

  middleware(req, res, () => { nextCalled = true })

  const serializedRequest = logger.children[0].serializers.req(req)
  res.emit('finish')

  assert.equal(nextCalled, true)
  assert.equal(req.log, logger)
  assert.equal(res.log, logger)
  assert.equal(req.reqId, 'existing-request-id')
  assert.equal(res.reqId, 'existing-request-id')
  assert.deepEqual(res.headers, { 'X-Request-Id': 'existing-request-id' })
  assert.equal(logger.children[1].req_id, 'existing-request-id')
  assert.equal(serializedRequest.headers['x-hub-signature'], null)
  assert.equal(logger.logs[0][0].req, req)
  assert.equal(logger.logs[0][0].res, res)
  assert.equal(typeof logger.logs[0][0].duration, 'number')
  assert.equal(logger.logs[0][1], 'request finish')
})
