const crypto = require('crypto')
const debug = require('debug')('github')

const secret = process.env.GITHUB_WEBHOOK_SECRET || 'hush-hush'

const sign = (secret, data) => {
  const buffer = new Buffer(data, 'utf8')
  return 'sha1=' + crypto.createHmac('sha1', secret).update(buffer).digest('hex')
}

module.exports = (app) => {
  app.post('/hooks/github', (req, res) => {
    const event = req.headers['x-github-event']
    if (!event) {
      res.writeHead(400, 'Event Header Missing')
      return res.end()
    }

    const signature = req.headers['x-hub-signature']
    if (!signature || signature !== sign(secret, req.raw)) {
      res.writeHead(401, 'Invalid Signature')
      console.error('! event@%s: %s - invalid signature, returning 401', source, data.action)
      return res.end()
    }

    res.end()

    const data = req.body
    data.action = data.action ? event + '.' + data.action : event

    var source = data.repository ? data.repository.full_name : data.organization.login
    console.log('event@%s: %s', source, data.action)

    if (debug.enabled) {
      debug(JSON.stringify(data, null, 2))
    }

    app.emit(data.action, data)
  })
}
