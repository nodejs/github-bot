'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')

module.exports = function (app) {
  app.post('/node/jenkins', (req, res) => {
    pushJenkinsUpdate({
      owner: 'nodejs',
      repoName: 'node'
    }, req.body)

    res.status(201).end()
  })
}
