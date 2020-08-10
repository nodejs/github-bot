'use strict'

const url = require('url')

function ignoreQueryParams (pathAndQuery) {
  return url.parse(pathAndQuery, true).pathname
}

module.exports = {
  ignoreQueryParams
}
