/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')
utils(tap)
const common = require('../common')
const createAiResponseServer = require('../aws-server-stubs/ai-server')
const { FAKE_CREDENTIALS } = require('../aws-server-stubs')
const modelId = 'ai21.j2-ultra-v1'

tap.beforeEach(async (t) => {
  const helper = utils.TestAgent.makeInstrumented({
    ai_monitoring: {
      enabled: true
    },
    feature_flag: {
      aws_bedrock_instrumentation: true
    }
  })
  common.registerInstrumentation(helper)
  t.context.helper = helper

  debugger
  const bedrock = require('@aws-sdk/client-bedrock-runtime')
  t.context.bedrock = bedrock

  const { server, baseUrl, responses, host, port } = await createAiResponseServer()
  t.context.server = server
  t.context.baseUrl = baseUrl
  t.context.responses = responses
  t.context.expectedExternalPath = `External/${host}:${port}/model/${modelId}/invoke`

  const client = new bedrock.BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: FAKE_CREDENTIALS,
    endpoint: baseUrl
  })
  t.context.client = client
})

tap.afterEach(async (t) => {
  t.context.helper.unload()
  t.context.server.destroy()
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('@smithy/smithy-client') ||
    key.includes('@aws-sdk/smithy-client') ||
    key.includes('@aws-sdk/client-bedrock-runtime')) {
      delete require.cache[key]
    }
  })
})

tap.test('should properly create completion segment', (t) => {
  const { bedrock, client, responses, helper, expectedExternalPath } = t.context
  const prompt = 'ultimate question'
  const command = new bedrock.InvokeModelCommand({
    body: JSON.stringify({ prompt }),
    modelId
  })

  const expected = responses.ai21.get(prompt)
  helper.runInTransaction(async (tx) => {
    const response = await client.send(command)
    const body = JSON.parse(response.body.transformToString('utf8'))
    t.equal(response.$metadata.requestId, expected.headers['x-amzn-requestid'])
    t.same(body, expected.body)
    t.segments(tx.trace.root, [
      {
        name: 'Llm/completion/Bedrock/InvokeModelCommand',
        children: [{ name: expectedExternalPath }]
      }
    ])
    tx.end()
    t.end()
  })
})

tap.test('should properly create the LlmChatCompletionMessage(s) and LlmChatCompletionSummary events', (t) => {
  const { bedrock, client, helper } = t.context
  const prompt = 'ultimate question'
  const command = new bedrock.InvokeModelCommand({
    body: JSON.stringify({ prompt }),
    modelId
  })

  const { agent } = helper
  helper.runInTransaction(async (tx) => {
    await client.send(command)
    const events = agent.customEventAggregator.events.toArray()
    debugger
    t.equal(events.length, 3)
    tx.end()
    t.end()
  })
})

tap.test('text answer (streamed)', async (t) => {
  const { bedrock, client, responses } = t.context
  const prompt = 'ultimate question streamed'
  const command = new bedrock.InvokeModelWithResponseStreamCommand({
    body: JSON.stringify({ prompt }),
    modelId
  })

  const expected = responses.ai21.get(prompt)
  try {
    await client.send(command)
  } catch (error) {
    t.equal(error.message, expected.body.message)
  }
})
