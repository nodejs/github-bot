const crypto = require('crypto')

const secret = process.env.GITHUB_WEBHOOK_SECRET || 'hush-hush'

function sign (data) {
  const buffer = Buffer.from(data, 'utf8')
  return 'sha1=' + crypto.createHmac('sha1', secret).update(buffer).digest('hex')
}

exports.isValid = function isValid (req) {
  const signature = req.headers['x-hub-signature']
  return signature && signature === sign(req.raw)
}
