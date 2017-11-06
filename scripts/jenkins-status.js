'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')
const enabledRepos = ['citgm', 'http-parser', 'node']

const jenkinsIpWhitelist = process.env.JENKINS_WORKER_IPS ? process.env.JENKINS_WORKER_IPS.split(',') : []

function isJenkinsIpWhitelisted (req) {
  const ip = req.connection.remoteAddress

  if (jenkinsIpWhitelist.length && !jenkinsIpWhitelist.includes(ip)) {
    req.log.warn({ ip }, 'Ignoring, not allowed to push Jenkins updates')
    return false
  }

  return true
}

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

    if (!isJenkinsIpWhitelisted(req)) {
      return res.status(401).end('Invalid Jenkins IP')
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

    if (!isJenkinsIpWhitelisted(req)) {
      return res.status(401).end('Invalid Jenkins IP')
    }

    pushJenkinsUpdate.pushEnded({
      owner: 'nodejs',
      repo,
      logger: req.log
    }, req.body)

    res.status(201).end()
  })
}
