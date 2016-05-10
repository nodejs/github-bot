'use strict'

const app = require('./app')

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('Bot listening on port', port)
})

// may open up an SSE relay channel helpful for local debugging
// of github repository events, wo/having to deploy changes
if (process.env.SSE_RELAY) {
  const EventSource = require('eventsource')
  const es = new EventSource(process.env.SSE_RELAY)
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      if (!data.action) return

      app.emitGhEvent(data)
    } catch (e) {
      console.error('Error while receiving SSE relay message', e)
    }
  }
}
