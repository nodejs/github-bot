'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')
const enabledRepos = ['citgm', 'http-parser', 'node']

const jenkinsIpWhitelist = process.env.JENKINS_WORKER_IPS ? process.env.JENKINS_WORKER_IPS.split(',') : []

function isJenkinsIpWhitelisted (req) {
  const ip = req.connection.remoteAddress.split(':').pop()

  if (jenkinsIpWhitelist.length && !jenkinsIpWhitelist.includes(ip)) {
    req.log.warn({ ip }, 'Ignoring, not allowed to push Jenkins updates')
    return false
  }

  return true
}

function isRelatedToPullRequest (gitRef) {
  // refs/pull/12345/head vs refs/heads/v8.x-staging/head
  return gitRef.includes('/pull/')
}

module.exports = function (app) {
  app.post('/:repo/jenkins/start', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)
    const repo = req.params.repo

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    if (!isRelatedToPullRequest(req.body.ref)) {
      return res.status(400).end('Will only push builds related to pull requests')
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
    }, req.body, (err) => {
      const statusCode = err !== null ? 500 : 201
      res.status(statusCode).end()
    })
  })

  app.post('/:repo/jenkins/end', (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)
    const repo = req.params.repo

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    if (!isRelatedToPullRequest(req.body.ref)) {
      return res.status(400).end('Will only push builds related to pull requests')
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
    }, req.body, (err) => {
      const statusCode = err !== null ? 500 : 201
      res.status(statusCode).end()
    })
  })
}
