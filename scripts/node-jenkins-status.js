'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')

module.exports = function (app) {
  app.post('/node/jenkins', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    pushJenkinsUpdate.push({
      owner: 'nodejs',
      repo: 'node',
      logger: req.log
    }, req.body)

    res.status(201).end()
  })
}
