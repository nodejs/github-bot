import assert from 'node:assert/strict'
import test from 'node:test'

process.env.LOGIN_CREDENTIALS = 'admin:secret'
const { default: authMiddleware } = await import('../../lib/auth-middleware.js')

function request (authorization) {
  return { headers: { authorization } }
}

function response () {
  return {
    headers: {},
    setHeader (name, value) {
      this.headers[name] = value
    },
    end (body) {
      this.body = body
    }
  }
}

test('accepts the configured credentials', () => {
  const req = request('Basic ' + Buffer.from('admin:secret').toString('base64'))
  const res = response()
  let nextCalled = false

  authMiddleware(req, res, () => { nextCalled = true })

  assert.equal(nextCalled, true)
  assert.equal(res.statusCode, undefined)
})

test('rejects missing or incorrect credentials', () => {
  for (const authorization of [undefined, 'Basic invalid', 'Bearer token']) {
    const res = response()
    let nextCalled = false

    authMiddleware(request(authorization), res, () => { nextCalled = true })

    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.equal(res.headers['WWW-Authenticate'], 'Basic realm="nodejs-github-bot"')
    assert.equal(res.body, 'Unauthorized')
  }
})
