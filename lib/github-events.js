const debug = require('debug')('github-events')

const githubSecret = require('./github-secret')

module.exports = (app) => {
  app.post('/hooks/github', (req, res) => {
    const event = req.headers['x-github-event']
    if (!event) {
      res.writeHead(400, 'Event Header Missing')
      return res.end()
    }

    if (!githubSecret.isValid(req)) {
      res.writeHead(401, 'Invalid Signature')
      req.log.error('Invalid GitHub event signature, returning 401')
      return res.end()
    }

    const data = req.body
    data.action = data.action ? event + '.' + data.action : event

    res.end()

    app.emitGhEvent(data, req.log)
  })

  app.emitGhEvent = function emitGhEvent (data, logger) {
    const repo = data.repository.name
    const org = data.repository.owner.login || data.organization.login
    const pr = data.number

    // create unique logger which is easily traceable throughout the entire app
    // by having e.g. "nodejs/nodejs.org/#1337" part of every subsequent log statement
    const prTrace = `${org}/${repo}/#${pr}`
    data.logger = logger.child({ pr: prTrace, action: data.action }, true)

    data.logger.info('Emitting GitHub event')
    debug(data)

    app.emit(data.action, data, org, repo, data.sender.login)
  }
}
