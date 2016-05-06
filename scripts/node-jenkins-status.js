'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')

module.exports = function (app) {
  app.post('/node/jenkins', (req, res) => {
    pushJenkinsUpdate({
      owner: 'TestOrgPleaseIgnore',
      repoName: 'node'
    }, req.body)

    res.end()
  })
}
