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
 * @property {string} content The human readable response from the LLM.
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
  content: '',
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

    const { agent, content, isResponse, index, completionId } = params

    this.is_response = isResponse
    this.conversation_id = this.conversationId(agent)
    this.completion_id = completionId
    this.sequence = index
    this.content = content
    this.role = ''

    if (this.is_response === true) {
      this.role = 'assistant'
      this.#setId(index)
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

  #setId(index) {
    if (this.isTitan() === true || this.isClaude() === true) {
      this.id = `${this.id}-${index}`
    } else if (this.isAi21() === true || this.isCohere() === true) {
      this.id = `${this.response.id}-${index}`
    }
  }
}

module.exports = LlmChatCompletionMessage
