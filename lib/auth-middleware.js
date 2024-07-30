/**
 * Routes using this middleware gets HTTP basic authentication.
 * There's only support for *one* username and password combination,
 * which is set in the $LOGIN_CREDENTIALS environment variable
 * in the follow format: "username:password"
 */

import auth from 'basic-auth'

const [username, password] = (process.env.LOGIN_CREDENTIALS || '').split(':')

export default function authMiddleware (req, res, next) {
  const user = auth(req)

  if (user === undefined || user.name !== username || user.pass !== password) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="nodejs-github-bot"')
    res.end('Unauthorized')
  } else {
    next()
  }
}
