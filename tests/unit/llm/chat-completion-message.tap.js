/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const LlmEvent = require('../../../lib/llm/event')
const LlmChatCompletionMessage = require('../../../lib/llm/chat-completion-message')

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
    },

    tracer: {
      getTransaction() {
        return {
          trace: {
            custom: {
              get(key) {
                return `${key} value`
              }
            }
          }
        }
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
  const event = new LlmChatCompletionMessage(t.context)
  t.type(event, LlmEvent)
  t.type(event, LlmChatCompletionMessage)
  t.equal(event.api_key_last_four_digits, '6789')
})
