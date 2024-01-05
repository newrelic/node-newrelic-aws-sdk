/*
 * Copyright 2024 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const structuredClone = require('./clone')
const BedrockResponse = require('../../../lib/llm/bedrock-response')

const ai21 = {
  id: 'ai21-response-1',
  completions: [
    {
      data: {
        text: 'ai21-response'
      },
      finishReason: {
        reason: 'done'
      }
    }
  ]
}

const claude = {
  completion: 'claude-response',
  stop_reason: 'done'
}

const cohere = {
  id: 'cohere-response-1',
  generations: [
    {
      text: 'cohere-response',
      finish_reason: 'done'
    }
  ]
}

const titan = {
  results: [
    {
      outputText: 'titan-response',
      completionReason: 'done'
    }
  ]
}

tap.beforeEach((t) => {
  t.context.response = {
    response: {
      statusCode: 200,
      headers: {
        'x-foo': 'foo'
      }
    },
    output: {
      requestId: 'aws-request-1',
      body: new TextEncoder().encode('{"foo":"foo"}')
    }
  }

  t.context.bedrockCommand = {
    isAi21() {
      return false
    },
    isClaude() {
      return false
    },
    isCohere() {
      return false
    },
    isTitan() {
      return false
    }
  }

  t.context.updatePayload = (payload) => {
    t.context.response.output.body = new TextEncoder().encode(JSON.stringify(payload))
  }
})

tap.test('non-conforming response is handled gracefully', async (t) => {
  const res = new BedrockResponse(t.context)
  t.same(res.completions, [])
  t.equal(res.finishReason, undefined)
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('ai21 malformed responses work', async (t) => {
  t.context.bedrockCommand.isAi21 = () => true
  const res = new BedrockResponse(t.context)
  t.same(res.completions, [])
  t.equal(res.finishReason, undefined)
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('ai21 complete responses work', async (t) => {
  t.context.bedrockCommand.isAi21 = () => true
  t.context.updatePayload(structuredClone(ai21))
  const res = new BedrockResponse(t.context)
  t.same(res.completions, ['ai21-response'])
  t.equal(res.finishReason, 'done')
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, 'ai21-response-1')
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('claude malformed responses work', async (t) => {
  t.context.bedrockCommand.isClaude = () => true
  const res = new BedrockResponse(t.context)
  t.same(res.completions, [])
  t.equal(res.finishReason, undefined)
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('claude complete responses work', async (t) => {
  t.context.bedrockCommand.isClaude = () => true
  t.context.updatePayload(structuredClone(claude))
  const res = new BedrockResponse(t.context)
  t.same(res.completions, ['claude-response'])
  t.equal(res.finishReason, 'done')
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('cohere malformed responses work', async (t) => {
  t.context.bedrockCommand.isCohere = () => true
  const res = new BedrockResponse(t.context)
  t.same(res.completions, [])
  t.equal(res.finishReason, undefined)
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('cohere complete responses work', async (t) => {
  t.context.bedrockCommand.isCohere = () => true
  t.context.updatePayload(structuredClone(cohere))
  const res = new BedrockResponse(t.context)
  t.same(res.completions, ['cohere-response'])
  t.equal(res.finishReason, 'done')
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, 'cohere-response-1')
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('titan malformed responses work', async (t) => {
  t.context.bedrockCommand.isTitan = () => true
  const res = new BedrockResponse(t.context)
  t.same(res.completions, [])
  t.equal(res.finishReason, undefined)
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})

tap.test('titan complete responses work', async (t) => {
  t.context.bedrockCommand.isTitan = () => true
  t.context.updatePayload(structuredClone(titan))
  const res = new BedrockResponse(t.context)
  t.same(res.completions, ['titan-response'])
  t.equal(res.finishReason, 'done')
  t.same(res.headers, { 'x-foo': 'foo' })
  t.equal(res.id, undefined)
  t.equal(res.requestId, 'aws-request-1')
  t.equal(res.statusCode, 200)
})
