export default function (app) {
  app.get('/ping', (req, res) => {
    res.end('pong')
  })
}
