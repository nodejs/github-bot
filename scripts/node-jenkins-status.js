'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')

module.exports = function (app) {
  app.post('/node/jenkins/start', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    pushJenkinsUpdate.pushStarted({
      owner: 'nodejs',
      repo: 'node',
      logger: req.log
    }, req.body)

    res.status(201).end()
  })

  app.post('/node/jenkins/end', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    pushJenkinsUpdate.pushEnded({
      owner: 'nodejs',
      repo: 'node',
      logger: req.log
    }, req.body)

    res.status(201).end()
  })
}
