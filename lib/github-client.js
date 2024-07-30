import { Octokit } from '@octokit/rest'

const githubClient = new Octokit({
  auth: process.env.GITHUB_TOKEN || 'invalid-placeholder-token',
  userAgent: 'Node.js GitHub Bot v1.0-beta',
  request: {
    timeout: 5 * 1000
  }
})

export default githubClient
