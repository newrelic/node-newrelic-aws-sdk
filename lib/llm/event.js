/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { randomUUID } = require('crypto')

/**
 * @typedef {object} LlmEventParams
 * @property {object} agent A New Relic agent instance.
 * @property {object} credentials An object representing the credentials that
 * will be used by the AWS client. This should match the result of
 * `await client.credentials()`.
 * @property {object} invokeCommand The InvokeModelCommand or
 * InvokeModelWithResponseStreamCommand instance that is used for the
 * conversation.
 * @property {IncomingMessage} response The HTTP response object from the remote
 * service.
 * @property {object} segment The current segment for the trace.
 */
/**
 * @type {LlmEventParams}
 */
const defaultParams = {
  agent: {},
  credentials: {
    accessKeyId: ''
  },
  invokeCommand: {},
  response: {},
  segment: {
    transaction: {}
  }
}

/**
 * Baseline object representing a LLM event.
 */
class LlmEvent {
  constructionParams
  #parsedBody
  #parsedInput

  /**
   * @param {LlmEventParams} params Construction parameters.
   */
  constructor(params = defaultParams) {
    params = Object.assign({}, defaultParams, params)
    this.constructionParams = params

    const { agent, credentials, response, segment } = params
    this.id = randomUUID()
    this.vendor = 'bedrock'
    this.ingest_source = 'Node'
    this.appName = agent.config.applications()[0]
    this.api_key_last_four_digits = credentials?.accessKeyId.slice(-4)
    this.span_id = segment.id
    this.transaction_id = segment.transaction.id
    this.trace_id = segment.transaction.traceId
    this.request_id = response.headers['x-amzn-requestid']

    if (response?.body) {
      const json = new TextDecoder().decode(response.body)
      this.#parsedBody = JSON.parse(json)
    }

    this['response.model'] = this.invokeInput?.modelId
    this['request.model'] = this.invokeInput?.modelId
    this['request.max_tokens'] = null

    this.error = false
  }

  /**
   * The `input` object from the invoke command object. The body of the
   * input command will be a plain JavaScript object instead of the JSON
   * string that is sent to the remote service.
   *
   * Unfortunately, since each model has its own parameter object shape, the
   * shape of the `body` property on the returned object is tied to the
   * `modelId`.
   *
   * @returns {object}
   */
  get invokeInput() {
    if (this.#parsedInput) {
      return this.#parsedInput
    }
    this.#parsedInput = this.constructionParams.invokeCommand.input
    this.#parsedInput.body = JSON.parse(this.#parsedInput.body)
    return this.#parsedInput
  }

  /**
   * The plain JavaScript object representation of the response from the
   * LLM service.
   *
   * @returns {object}
   */
  get response() {
    return this.#parsedBody
  }

  /**
   * Given a model identifier, determine if the model is an "embedding" model.
   *
   * @param {string} modelId
   *
   * @returns {boolean}
   */
  static isEmbeddingModel(modelId) {
    // At the moment, this is a simple check. If Amazon ever introduces a
    // complex identifier, we can implement a more complicated check.
    return modelId.toLowerCase().includes('embed')
  }

  /**
   * Retrieve the conversation identifier from the custom attributes
   * stored in the current transaction.
   *
   * @param {object} agent The New Relic agent that provides access to the
   * transaction.
   *
   * @returns {string}
   */
  conversationId(agent) {
    const tx = agent.tracer.getTransaction()
    const attrs = tx?.trace?.custom.get(0x01 | 0x02 | 0x04 | 0x08)
    return attrs?.['llm.conversation_id']
  }

  isAi21() {
    return this.invokeInput?.modelId.startsWith('ai21.')
  }

  isClaude() {
    return this.invokeInput?.modelId.startsWith('anthropic.claude')
  }

  isCohere() {
    return this.invokeInput?.modelId.startsWith('cohere.')
  }

  isCohereEmbed() {
    return this.invokeInput?.modelId.startsWith('cohere.embed')
  }

  isTitan() {
    return this.invokeInput?.modelId.startsWith('amazon.titan')
  }

  isTitanEmbed() {
    return this.invokeInput?.modelId.startsWith('amazon.titan-embed')
  }
}

module.exports = LlmEvent
