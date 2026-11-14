import { Writable } from 'node:stream'

import CLI from '@node-core/utils/lib/cli.js'
import Request from '@node-core/utils/lib/request.js'
import { PRBuild } from '@node-core/utils/lib/ci/build-types/pr_build.js'

import { createPrComment } from './github-comment.js'

const maxCommentLength = 60_000

export function extractBuildNumber (build) {
  // e.g. https://ci.nodejs.org/job/node-test-pull-request/21633/
  const match = /\/job\/node-test-pull-request\/(\d+)/.exec(build.url || '')
  return match ? parseInt(match[1], 10) : null
}

export async function fetchResultsMarkdown (buildNumber, destination) {
  // node-core-utils insists on writing progress output to a stream
  const nullStream = new Writable({ write (chunk, encoding, callback) { callback() } })
  const cli = new CLI(nullStream)
  const request = new Request({
    jenkins: Buffer.from(process.env.JENKINS_API_CREDENTIALS).toString('base64')
  })

  const prBuild = new PRBuild(cli, request, buildNumber)
  const results = await prBuild.getResults()
  const failures = Array.isArray(results) ? results : results.failures
  const requestFailure = failures?.find(failure => failure?.type === 'NCU_FAILURE')

  if (requestFailure) {
    throw new Error(`Unable to retrieve Jenkins CI results: ${requestFailure.reason}`)
  }

  validateBuildDestination(prBuild.params, destination)
  return prBuild.formatAsMarkdown()
}

export function validateBuildDestination (params, { owner, repo, pr }) {
  const matches =
    params.TARGET_GITHUB_ORG?.toLowerCase() === owner.toLowerCase() &&
    params.TARGET_REPO_NAME?.toLowerCase() === repo.toLowerCase() &&
    String(params.PR_ID) === String(pr)

  if (!matches) {
    throw new Error('Jenkins build does not belong to the destination pull request')
  }
}

export function limitResultsMarkdown (markdown, buildUrl) {
  if (markdown.length <= maxCommentLength) return markdown

  const notice = `\n\n---\nCI results were truncated. [View the complete results in Jenkins](${buildUrl}).`
  const availableLength = maxCommentLength - notice.length
  let truncated = markdown.slice(0, availableLength)

  // node-core-utils puts detailed failures in <details> blocks containing
  // fenced code. Avoid cutting a block in half and producing broken Markdown.
  const firstDetails = truncated.indexOf('<details>')
  const lastCompleteDetails = truncated.lastIndexOf('</details>')
  if (firstDetails !== -1) {
    truncated = lastCompleteDetails === -1
      ? truncated.slice(0, firstDetails)
      : truncated.slice(0, lastCompleteDetails + '</details>'.length)
  }

  return truncated.trimEnd() + notice
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

  const markdown = await fetchResults(buildNumber, {
    owner: options.owner,
    repo: options.repo,
    pr
  })

  if (!markdown) {
    logger.warn('Got no CI results back from node-core-utils, skipping CI results comment')
    return
  }

  const comment = limitResultsMarkdown(markdown, build.url)
  await createPrComment({ issue_number: pr, ...options, logger }, comment)
  logger.info('Jenkins CI results comment posted')
}
