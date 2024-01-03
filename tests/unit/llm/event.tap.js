/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const LlmEvent = require('../../../lib/llm/event')

tap.beforeEach((t) => {
  t.context.agent = {
    config: {
      applications() {
        return ['test-app']
      }
    },
    llm: {
      metadata: {
        foo: 'foo'
      }
    }
  }

  t.context.awsClient = {
    config: {
      credentials() {
        return Promise.resolve({
          accessKeyId: '123456789'
        })
      }
    }
  }

  t.context.response = {
    headers: {
      'x-amzn-requestid': 'request-1'
    }
  }
})

tap.test('create creates a new instance', async (t) => {
  const { agent, awsClient, response } = t.context
  const event = await LlmEvent.create({ agent, awsClient, response })
  t.ok(event)
  t.equal(event.api_key_last_four_digits, '6789')
})
