'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')
const enabledRepos = ['citgm', 'node']

module.exports = function (app) {
  app.post('/:repo/jenkins/start', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)
    const repo = req.params.repo

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    if (!enabledRepos.includes(repo)) {
      return res.status(400).end('Invalid repository')
    }

    pushJenkinsUpdate.pushStarted({
      owner: 'nodejs',
      repo,
      logger: req.log
    }, req.body)

    res.status(201).end()
  })

  app.post('/:repo/jenkins/end', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)
    const repo = req.params.repo

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    if (!enabledRepos.includes(repo)) {
      return res.status(400).end('Invalid repository')
    }

    pushJenkinsUpdate.pushEnded({
      owner: 'nodejs',
      repo,
      logger: req.log
    }, req.body)

    res.status(201).end()
  })
}
