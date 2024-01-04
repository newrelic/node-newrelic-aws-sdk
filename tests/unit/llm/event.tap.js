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

  t.context.credentials = {
    accessKeyId: '123456789'
  }

  t.context.response = {
    response: {
      headers: {
        'x-amzn-requestid': 'request-1'
      }
    },
    output: {
      body: Buffer.from('{"results":[]}')
    }
  }

  t.context.invokeCommand = {
    input: {
      accept: 'application/json',
      contentType: 'application/json',
      modelId: 'amazon.titan-text-express-v1',
      body: '{"foo":"foo"}'
    }
  }
})

tap.test('create creates a new instance', async (t) => {
  const event = new LlmEvent(t.context)
  t.ok(event)
  t.equal(event.api_key_last_four_digits, '6789')
})
