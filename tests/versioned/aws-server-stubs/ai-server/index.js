/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

module.exports = createAiResponseServer

const http = require('http')
const { patchDestroy } = require('../common')
const responses = require('./responses')

/**
 * Creates a new HTTP server to serve responses for Amazon AI requests
 * (i.e. the Bedrock API). The returned server is listening on `localhost`
 * and a random port.
 *
 * @returns Promise<object> Has `server`, `host`, `port`, `baseUrl`,
 * and `responses` properties.
 */
function createAiResponseServer() {
  const server = http.createServer(handler)

  patchDestroy(server)

  return new Promise((resolve, reject) => {
    server.listen({ host: '127.0.0.1', port: 0 }, (error) => {
      if (error) {
        return reject(error)
      }

      const addy = server.address()
      return resolve({
        server,
        host: addy.address,
        port: addy.port,
        baseUrl: `http://${addy.address}:${addy.port}`,
        responses
      })
    })
  })
}

function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 400
    res.end()
    return
  }

  let data = Buffer.alloc(0)
  req.on('data', (chunk) => {
    data = Buffer.concat([data, chunk])
  })

  req.on('end', () => {
    const payload = JSON.parse(data.toString('utf8'))

    // Available  model identifiers are listed at:
    // https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html
    const [, model] = /model\/(.+)\/invoke/.exec(req.url)
    let response
    switch (model) {
      case 'anthropic.claude-v2':
      case 'anthropic.claude-v2:1': {
        response = responses.claude.get(payload.prompt)
        break
      }

      default: {
        response = { statusCode: 418, body: {} }
      }
    }

    res.statusCode = response.statusCode
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value)
    }
    res.end(JSON.stringify(response.body))
  })
}
