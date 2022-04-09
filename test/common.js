'use strict'

function ignoreQueryParams (pathAndQuery) {
  return new URL(pathAndQuery, 'http://apis.github.com/').pathname
}

module.exports = {
  ignoreQueryParams
}
