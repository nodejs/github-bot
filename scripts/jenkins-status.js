import * as pushJenkinsUpdate from '../lib/push-jenkins-update.js'

function handleJenkinsStart (event) {
  const { repo, owner } = event

  pushJenkinsUpdate.pushStarted({
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

  pushJenkinsUpdate.pushEnded({
    owner,
    repo,
    logger: event.logger
  }, event, (err) => {
    if (err) {
      event.logger.error(err, 'Error while handling Jenkins end event')
    }
  })
}

export default function (_, event) {
  event.on('jenkins.start', handleJenkinsStart)
  event.on('jenkins.end', handleJenkinsStop)
}
