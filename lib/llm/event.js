/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const { randomUUID } = require('crypto')

/**
 * @typedef {object} LlmEventParams
 * @property {object} agent A New Relic agent instance.
 * @property {IncomingMessage} response The HTTP response object from the remote
 * service.
 * @property {object} invokeCommand The InvokeModelCommand or
 * InvokeModelWithResponseStreamCommand instance that is used for the
 * conversation.
 */
/**
 * @type {LlmEventParams}
 */
const defaultParams = {
  agent: {},
  response: {},
  invokeCommand: {}
}

/**
 * @typedef {object} LlmEventCreateParams
 * @augments LlmEventParams
 * @property {object} awsClient An AWS SDK client instance.
 */
/**
 * @type {LlmEventCreateParams}
 */
const createDefaultParams = {
  ...defaultParams,
  awsClient: {}
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
    this.constructionParams = params

    const { agent, response } = params
    this.id = randomUUID()
    this.vendor = 'bedrock'
    this.ingest_source = 'Node'
    this.appName = agent.config.applications()[0]

    if (response?.body) {
      const json = new TextDecoder().decode(response.body)
      this.#parsedBody = JSON.parse(json)
    }

    this.span_id = null
    this.transaction_id = null
    this.trace_id = null

    this.request_id = response.headers['x-amzn-requestid']
    this.input = null
    this.api_key_last_four_digits = null

    this['response.model'] = this.invokeInput?.modelId
    this['request.model'] = this.invokeInput?.modelId
    this['request.max_tokens'] = null

    this.duration = -1
    this.content = null
    this.role = null
    this.sequence = -1
    this.completion_id = null
    this['request.temperature'] = null
    this.error = false
    this.is_response = false

    for (const [k, v] of Object.entries(agent.llm.metadata)) {
      this[k] = v
    }
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
   * Create a new LlmEvent with AWS specific information added. Specifically,
   * it gets the credentials from the client and adds the last four digits of
   * the access key to the event.
   *
   * @param {LlmEventCreateParams} params
   *
   * @returns {Promise<LlmEvent>}
   */
  static async create(params = createDefaultParams) {
    const { agent, awsClient, response } = params
    const event = new LlmEvent({ agent, response })
    await event.addKeyDigits(awsClient)
    return event
  }

  /**
   * Gets the AWS authentication credentials from the client and adds the
   * last for digits of the access key to the current event instance.
   *
   * @param {object} awsClient An AWS SDK client instance.
   *
   * @returns {Promise<void>}
   */
  async addKeyDigits(awsClient) {
    const credentials = await awsClient.config.credentials()
    this.api_key_last_four_digits = credentials.accessKeyId.slice(-4)
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
    const attrs = tx?.trace?.custom.get('TODO')
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
