const url = require('url')

const githubClient = require('../lib/github-client')

const threeDaysAgo = (24 * 60 * 60 * 1000) * 3
let minimumDate

const createStatus = (options, logger) => {
  githubClient.repos.createStatus({
    owner: 'nodejs',
    repo: 'node',
    sha: options.sha,
    target_url: '',
    context: 'wait-time',
    state: options.state,
    description: 'Pull requests must remain open for at least 72 hours'
  })
}

const pageNumberFromURL = (githubUrl) => {
  return url.parse(githubUrl, true).query.page
}

const checkPullRequest = (pr) => {
  const isValid = !(pr.labels.map((l) => { return l.name }).includes('fast-track')) &&
    (new Date(pr.created_at) < minimumDate)

  if (isValid) {
    createStatus({
      sha: pr.head.sha,
      state: 'success'
    })
  }
}

const checkPullRequests = (pageNumber = 1) => {
  const date = new Date()
  date.setTime(date.getTime() - threeDaysAgo)
  minimumDate = date

  githubClient.pullRequests.getAll({
    owner: 'nodejs',
    repo: 'node',
    state: 'open',
    sort: 'created',
    page: pageNumber,
    per_page: 100
  }, (err, res) => {
    if (err) throw err
    res.data.forEach(checkPullRequest)

    const lastPageURL = githubClient.hasLastPage(res)
    if (lastPageURL) {
      checkPullRequests(pageNumberFromURL(lastPageURL))
    }
  })
}

module.exports = {
  createStatus,
  checkPullRequests
}
