'use strict'

/**
 * Routes using this middleware gets HTTP basic authentication.
 * There's only support for *one* username and password combination,
 * which is set in the $LOGIN_CREDENTIALS environment variable
 * in the follow format: "username:password"
 */

const auth = require('basic-auth')

const pkg = require('../package')

const [ username, password ] = (process.env.LOGIN_CREDENTIALS || '').split(':')

module.exports = function authMiddleware (req, res, next) {
  const user = auth(req)

  if (user === undefined || user['name'] !== username || user['pass'] !== password) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', `Basic realm="${pkg.name}"`)
    res.end('Unauthorized')
  } else {
    next()
  }
}
