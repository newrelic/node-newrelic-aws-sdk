/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const responses = new Map()

responses.set('insufficient context', {
  headers: {
    'content-type': 'application/json',
    'x-amzn-requestid': '3d4ce4d4-dd79-44e8-96d5-89d3a733ded6',
    'x-amzn-bedrock-invocation-latency': '926',
    'x-amzn-bedrock-output-token-count': '36',
    'x-amzn-bedrock-input-token-count': '14'
  },
  statusCode: 200,
  body: {
    completion:
      " I'm afraid I don't have enough context to determine the answer to your question. Could you please provide some more details about what specific question you are asking?",
    stop_reason: 'stop_sequence',
    stop: '\n\nHuman:'
  }
})

responses.set('ultimate question', {
  headers: {
    'content-type': 'application/json',
    'x-amzn-requestid': '911bc6d9-84ec-4503-97ec-c2943d13dc89',
    'x-amzn-bedrock-invocation-latency': '609',
    'x-amzn-bedrock-output-token-count': '6',
    'x-amzn-bedrock-input-token-count': '22'
  },
  statusCode: 200,
  body: {
    // "What is the answer to life, the universe, and everything?"
    completion: ' 42.',
    stop_reason: 'stop_sequence',
    stop: '\n\nHuman:'
  }
})

module.exports = responses
