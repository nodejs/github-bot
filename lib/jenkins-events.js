'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')

const debug = require('debug')('jenkins-events')
const enabledRepos = ['citgm', 'http-parser', 'node', 'node-auto-test']

const listOfKnownJenkinsIps = process.env.JENKINS_WORKER_IPS ? process.env.JENKINS_WORKER_IPS.split(',') : []

function isKnownJenkinsIp (req) {
  const ip = req.connection.remoteAddress.split(':').pop()

  if (listOfKnownJenkinsIps.length && !listOfKnownJenkinsIps.includes(ip)) {
    req.log.warn({ ip }, 'Ignoring, not allowed to push Jenkins updates')
    return false
  }

  return true
}

function isRelatedToPullRequest (gitRef) {
  // refs/pull/12345/head vs refs/heads/v8.x-staging/head
  return gitRef.includes('/pull/')
}

module.exports = (app, events) => {
  app.post('/:repo/jenkins/:event', async (req, res) => {
    const isValid = pushJenkinsUpdate.validate(req.body)
    const repo = req.params.repo
    const event = req.params.event
    const owner = req.body.owner || process.env.JENKINS_DEFAULT_GH_OWNER || 'nodejs'

    if (!isValid) {
      return res.status(400).end('Invalid payload')
    }

    if (!isRelatedToPullRequest(req.body.ref)) {
      return res.status(400).end('Will only push builds related to pull requests')
    }

    if (!enabledRepos.includes(repo)) {
      return res.status(400).end('Invalid repository')
    }

    if (!isKnownJenkinsIp(req)) {
      return res.status(401).end('Invalid Jenkins IP')
    }

    const data = {
      ...req.body,
      owner,
      repo,
      event
    }

    try {
      await app.emitJenkinsEvent(event, data, req.log)
      res.status(200)
    } catch (err) {
      req.log.error(err, 'Error while emitting Jenkins event')
      res.status(500)
    }

    res.end()
  })

  app.emitJenkinsEvent = function emitJenkinsEvent (event, data, logger) {
    const { identifier } = data

    // create unique logger which is easily traceable throughout the entire app
    // by having e.g. "nodejs/nodejs.org/#1337" part of every subsequent log statement
    data.logger = logger.child({ identifier, event }, true)

    data.logger.info('Emitting Jenkins event')
    debug(data)

    return events.emit(`jenkins.${event}`, data)
  }
}
