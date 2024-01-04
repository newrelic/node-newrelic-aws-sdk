/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const LlmEvent = require('./event')

/**
 * @typedef {object} LlmChatCompletionParams
 * @augments LlmEventParams
 * @property {string} completionId An identifier for the completion message.
 * @property {number} [index=0] The order of the message in the conversation.
 * @property {boolean} [isResponse=false] Indicates if the message represents
 * a response from the LLM.
 * @property {object} message The message sent to the LLM.
 * @property {OutgoingMessage} request The outgoing HTTP request used in the
 * LLM conversation.
 */
/**
 * @type {LlmChatCompletionParams}
 */
const defaultParams = {
  completionId: '',
  index: 0,
  isResponse: false,
  message: {},
  request: {}
}

/**
 * Represents an LLM chat completion.
 */
class LlmChatCompletionMessage extends LlmEvent {
  constructor(params = defaultParams) {
    super(params)

    const { agent, isResponse, index, completionId } = params

    this.is_response = isResponse
    this.conversation_id = this.conversationId(agent)
    this.completion_id = completionId
    this.sequence = index
    this.content = null
    this.role = ''

    if (this.is_response === true) {
      this.role = 'assistant'
      this.#setId(index)
      this.#setResponseContent()
    } else {
      this.role = 'user'
      this.#setRequestContent()
    }
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
