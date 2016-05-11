const crypto = require('crypto')
const debug = require('debug')('github-events')

const logger = require('./logger')

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
    const data = req.body
    data.action = data.action ? event + '.' + data.action : event

    if (!signature || signature !== sign(secret, req.raw)) {
      res.writeHead(401, 'Invalid Signature')
      logger.error('! event@%s: %s - invalid signature, returning 401', data.repository.full_name, data.action)
      return res.end()
    }

    res.end()

    app.emitGhEvent(data)
  })

  app.emitGhEvent = function emitGhEvent (data) {
    const repo = data.repository
    const org = repo.owner.login || data.organization.login

    logger.info('* event@%s/%s: %s', org, repo.name, data.action)
    debug(data)

    app.emit(data.action, data, org, repo.name, data.sender.login)
  }
}
