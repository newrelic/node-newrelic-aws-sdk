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
  const event = await LlmChatCompletionMessage.create({ agent, awsClient, response })
  t.type(event, LlmEvent)
  t.type(event, LlmChatCompletionMessage)
  t.equal(event.api_key_last_four_digits, '6789')
})