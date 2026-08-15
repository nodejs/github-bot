import { Writable } from 'node:stream'

import CLI from 'node-core-utils/lib/cli.js'
import Request from 'node-core-utils/lib/request.js'
import { PRBuild } from 'node-core-utils/lib/ci/build-types/pr_build.js'

import { createPrComment } from './github-comment.js'

export function extractBuildNumber (build) {
  // e.g. https://ci.nodejs.org/job/node-test-pull-request/21633/
  const match = /\/job\/node-test-pull-request\/(\d+)/.exec(build.url || '')
  return match ? parseInt(match[1], 10) : null
}

export async function fetchResultsMarkdown (buildNumber) {
  // node-core-utils insists on writing progress output to a stream
  const nullStream = new Writable({ write (chunk, encoding, callback) { callback() } })
  const cli = new CLI(nullStream)
  const request = new Request({
    jenkins: Buffer.from(process.env.JENKINS_API_CREDENTIALS).toString('base64')
  })

  const prBuild = new PRBuild(cli, request, buildNumber)
  await prBuild.getResults()
  return prBuild.formatAsMarkdown()
}

export async function postBuildResults (options, build, fetchResults = fetchResultsMarkdown) {
  const { pr } = options
  const buildNumber = extractBuildNumber(build)

  const traceFields = { pr, job: build.identifier, gitRef: build.ref, buildNumber }
  const logger = options.logger.child(traceFields, true)

  if (!process.env.JENKINS_API_CREDENTIALS) {
    logger.info('JENKINS_API_CREDENTIALS is not set, skipping CI results comment')
    return
  }

  if (buildNumber === null) {
    logger.warn('Unable to find build number in build URL, skipping CI results comment')
    return
  }

  const markdown = await fetchResults(buildNumber)

  if (!markdown) {
    logger.warn('Got no CI results back from node-core-utils, skipping CI results comment')
    return
  }

  await createPrComment({ issue_number: pr, ...options, logger }, markdown)
  logger.info('Jenkins CI results comment posted')
}
