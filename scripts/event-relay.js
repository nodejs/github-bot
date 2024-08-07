import githubClient from '../lib/github-client.js'

async function handleJenkinsRelay (event) {
  const { owner, repo, identifier } = event
  const eventType = `jenkins.${identifier}.${event.event}`
  try {
    event.logger.debug(`Relaying ${eventType} to ${owner}/${repo}`)
    await githubClient.repos.createDispatchEvent({
      owner,
      repo,
      event_type: eventType,
      client_payload: event
    })
    return true
  } catch (err) {
    event.logger.error(err, `Failed to relay ${eventType} to ${owner}/${repo}`)
    return false
  }
}

export default function (_, event) {
  event.on('jenkins', handleJenkinsRelay)
}
