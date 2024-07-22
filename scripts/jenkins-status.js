'use strict'

const pushJenkinsUpdate = require('../lib/push-jenkins-update')

function handleJenkinsStart (event) {
  const { repo, owner } = event

  return pushJenkinsUpdate.pushStarted({
    owner,
    repo,
    logger: event.logger
  }, event, (err) => {
    if (err) {
      event.logger.error(err, 'Error while handling Jenkins start event')
    }
  })
}

function handleJenkinsStop (event) {
  const { repo, owner } = event

  return pushJenkinsUpdate.pushEnded({
    owner,
    repo,
    logger: event.logger
  }, event, (err) => {
    if (err) {
      event.logger.error(err, 'Error while handling Jenkins end event')
    }
  })
}

module.exports = function (_, event) {
  event.on('jenkins.start', handleJenkinsStart)
  event.on('jenkins.end', handleJenkinsStop)
}
