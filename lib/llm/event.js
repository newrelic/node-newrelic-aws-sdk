/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { randomUUID } = require('crypto')

/**
 * @typedef {object} AwsMiddlewareResponse
 * @property {object} response Has a `body` property that is an IncomingMessage
 * a `headers` property that are the response headers, a `reason` property that
 * indicates the status code reason, and a `statusCode` property.
 * @property {object} output Has a `$metadata` property that includes the
 * `requestId`, and a `body` property that is a Uint8Array representation
 * of the response payload.
 */

/**
 * @typedef {object} LlmEventParams
 * @property {object} agent A New Relic agent instance.
 * @property {object} credentials An object representing the credentials that
 * will be used by the AWS client. This should match the result of
 * `await client.credentials()`.
 * @property {object} invokeCommand The InvokeModelCommand or
 * InvokeModelWithResponseStreamCommand instance that is used for the
 * conversation.
 * @property {AwsMiddlewareResponse} response The response object from the
 * remote service. This is not a traditional IncomingMessage. It is internal to
 * the AWS SDK's middleware system.
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
  /**
   * All parameters that were passed in to the constructor after they have
   * been merged with the constructor's defaults.
   */
  constructionParams

  /**
   * A normalized representation of an LLM response. Has a `completions`
   * property that is an array of prompt responses. The `_original` property
   * is the original, non-normalized, response body.
   */
  #parsedBody

  /**
   * The deserialized form of the input that was used to create the invoke
   * command. When `new InvokeCommand(input)` is performed, it serializes the
   * `input` object into a JSON string. The value of this private property is
   * the deserialized value of that JSON string.
   */
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

    this.#parseResponseBody(response)

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
   * Parses the AWS response and builds a normalized internal representation.
   * The result is accessible via `event.response`.
   *
   * @param {AwsMiddlewareResponse} response
   */
  #parseResponseBody(response) {
    const {
      response: { body }
    } = response
    if (!body) {
      return
    }

    const json = new TextDecoder().decode(body)
    this.#parsedBody = {
      _original: JSON.parse(json),
      completions: []
    }

    const src = this.#parsedBody._original
    if (this.isAi21() === true) {
      this.#parsedBody.completions = src.completions.map((c) => c.data.text)
    } else if (this.isClaude() === true) {
      // TODO: can we make this thing give more than one completion?
      this.#parsedBody.completions.push(src.completion)
    } else if (this.isCohere() === true) {
      this.#parsedBody.completions = src.generations.map((g) => g.text)
    } else if (this.isTitan() === true) {
      this.#parsedBody.completions = src.results.map((r) => r.outputText)
    }
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
    // This magic number is brought to you by:
    // https://github.com/newrelic/node-newrelic/blob/10762a7/lib/config/attribute-filter.js#L10-L23
    // We hard code it here because we'd have a cyclic dependency if we tried
    // to import it from `newrelic` (`newrelic` uses this module to provide
    // the AWS instrumentation).
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
