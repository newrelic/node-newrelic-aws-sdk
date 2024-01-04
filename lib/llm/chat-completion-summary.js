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

    const { agent, response, segment } = params
    this.conversation_id = this.conversationId(agent)
    this.#setMaxTokens()
    this.duration = segment.getDurationInMillis()

    const utt = 'response.usage.total_tokens'
    const nm = 'response.number_of_messages'
    const upt = 'response.usage.prompt_tokens'
    const uct = 'response.usage.completion_tokens'
    const cfr = 'response.choices.finish_reason'
    const rt = 'request.temperature'

    this[uct] = parseInt(response.headers['x-amzn-bedrock-output-token-count'] || 0, 10)
    this[upt] = parseInt(response.headers['x-amzn-bedrock-input-token-count'] || 0, 10)
    this[utt] = this[upt] + this[uct]

    if (this.isTitan() === true) {
      this[nm] = 1 + this.response.results.length
      this[cfr] = this.response.results?.[0]?.completionReason
      this[rt] = this.invokeInput.body?.textGenerationConfig.temperature
    } else if (this.isClaude() === true) {
      this[nm] = 2
      this[cfr] = this.response.stop_reason
      this[rt] = this.invokeInput.body.temperature
    } else if (this.isAi21() === true) {
      this[nm] = 1 + this.response.completions.length
      this[cfr] = this.response.results?.[0]?.finishReason.reason
      this[rt] = this.invokeInput.body.temperature
    } else if (this.isCohere() === true) {
      this[nm] = 1 + this.response.generations.length
      this[cfr] = this.response.results?.generations?.[0].finish_reason
      this[rt] = this.invokeInput.body.temperature
    }
  }

  #setMaxTokens() {
    const prop = 'request.max_tokens'
    if (this.isTitan() === true) {
      this[prop] = this.invokeInput.body.textGenerationConfig.maxTokenCount
    } else if (this.isClaude() === true) {
      this[prop] = this.invokeInput.body.max_tokens_to_sample
    } else if (this.isAi21() === true) {
      this[prop] = this.invokeInput.body.maxTokens
    } else if (this.isCohere() === true) {
      this[prop] = this.invokeInput.body.max_tokens
    }
  }
}

module.exports = LlmChatCompletionSummary
