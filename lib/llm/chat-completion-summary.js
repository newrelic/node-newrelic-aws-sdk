/*
 * Copyright 2024 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const LlmEvent = require('./event')

/**
 * @typedef {object} LlmChatCompletionSummaryParams
 * @augments LlmEventParams
 */
/**
 * @type {LlmChatCompletionSummaryParams}
 */
const defaultParams = {}

/**
 * Represents an LLM chat completion summary.
 */
class LlmChatCompletionSummary extends LlmEvent {
  constructor(params = defaultParams) {
    super(params)

    const { agent, segment } = params
    this.conversation_id = this.conversationId(agent)
    this.duration = segment.getDurationInMillis()
    this['request.max_tokens'] = this.bedrockCommand.maxTokens

    const utt = 'response.usage.total_tokens'
    const nm = 'response.number_of_messages'
    const upt = 'response.usage.prompt_tokens'
    const uct = 'response.usage.completion_tokens'
    const cfr = 'response.choices.finish_reason'
    const rt = 'request.temperature'

    const cmd = this.bedrockCommand
    this[uct] = parseInt(this.bedrockResponse.headers['x-amzn-bedrock-output-token-count'] || 0, 10)
    this[upt] = parseInt(this.bedrockResponse.headers['x-amzn-bedrock-input-token-count'] || 0, 10)
    this[utt] = this[upt] + this[uct]
    this[cfr] = cmd.finishReason
    this[rt] = cmd.temperature

    if (cmd.isTitan() === true) {
      this[nm] = 1 + this.bedrockResponse.completions.length
    } else if (cmd.isClaude() === true) {
      this[nm] = 2
    } else if (cmd.isAi21() === true) {
      this[nm] = 1 + this.bedrockResponse.completions.length
    } else if (cmd.isCohere() === true) {
      this[nm] = 1 + this.bedrockResponse.completions.length
    }
  }
}

module.exports = LlmChatCompletionSummary
