/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const LlmEvent = require('./event')

/**
 * @typedef {object} LlmChatCompletionParams
 * @augments LlmEventParams
 * @property {object} segment A New Relic trace segment object.
 * @property {OutgoingMessage} request The outgoing HTTP request used in the
 * LLM conversation.
 * @property {number} [index=0] The order of the message in the conversation.
 * @property {object} message The message sent to the LLM.
 * @property {string} completionId An identifier for the completion message.
 */
/**
 * @type {LlmChatCompletionParams}
 */
const defaultParams = {
  agent: {},
  segment: {},
  request: {},
  response: {},
  invokeCommand: {},
  index: 0,
  message: {},
  completionId: ''
}

/**
 * @typedef {object} LlmChatCompletionCreateParams
 * @augments LlmChatCompletionParams
 * @property {object} awsClient An AWS SDK client instance.
 */
/**
 * @type LlmChatCompletionCreateParams
 */
const createDefaultParams = {
  ...defaultParams,
  awsClient: {}
}

/**
 * Represents an LLM chat completion.
 */
class LlmChatCompletionMessage extends LlmEvent {
  constructor(params = defaultParams) {
    const { agent, response, index, completionId } = params
    super({ agent, response })

    this.is_response = Object.keys(response) > 0
    this.conversation_id = this.conversationId(agent)
    this.completion_id = completionId

    if (this.isResponse === true) {
      this.role = 'assistant'
      this.#setId(index)
      this.#setResponseContent()
    } else {
      this.role = 'user'
      this.#setRequestContent()
    }
  }

  /**
   * Create a new LlmChatCompletionMessage with AWS specific information
   * added. Specifically, it gets the credentials from the client and adds the
   * last four digits of the access key to the message.
   *
   * @param {LlmChatCompletionCreateParams} params
   *
   * @returns {Promise<LlmChatCompletionMessage>}
   */
  static async create(params = createDefaultParams) {
    const { awsClient } = params
    const event = new LlmChatCompletionMessage(params)
    await event.addKeyDigits(awsClient)
    return event
  }

  #setRequestContent() {
    if (this.isTitan() === true) {
      this.content = this.invokeInput.body.inputText
    } else if (this.isClaude() === true || this.isAi21() === true || this.isCohere() === true) {
      this.content = this.invokeInput.body.prompt
    }
  }

  #setResponseContent() {
    if (this.isTitan() === true) {
      this.content = this.response.results.map((r) => r.outputText)
    } else if (this.isClaude() === true) {
      this.content = this.response.completion
    } else if (this.isAi21() === true) {
      this.content = this.response.completions.map((c) => c.data.text)
    } else if (this.isCohere() === true) {
      this.content = this.response.generations.map((g) => g.text)
    }
  }

  #setId(index) {
    if (this.isTitan() === true || this.isClaude() === true) {
      this.id = `${this.id}-${index}`
    } else if (this.isAi21() === true || this.isCohere() === true) {
      this.id = `${this.response.id}-${index}`
    }
  }
}

module.exports = LlmChatCompletionMessage
