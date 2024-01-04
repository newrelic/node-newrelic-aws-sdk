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
    this.#setMaxTokens()
    this.duration = segment.getDurationInMillis()

    const utt = 'response.usage.total_tokens'
    const nm = 'response.number_of_messages'
    const upt = 'response.usage.prompt_tokens'
    const uct = 'response.usage.completion_tokens'
    const cfr = 'response.choices.finish_reason'
    const rt = 'request.temperature'
    if (this.isTitan() === true) {
      const tokenCount = this.response.results.reduce((acc, cv) => acc + cv.tokenCount, 0)
      this[utt] = this.response.inputTextTokenCount + tokenCount
      this[nm] = 1 + this.response.results.length
      this[upt] = this.response.inputTextTokenCount
      this[uct] = tokenCount
      this[cfr] = this.response.results?.[0]?.completionReason
      this[rt] = this.invokeInput.body?.textGenerationConfig.temperature
    } else if (this.isClaude() === true) {
      this[utt] = undefined
      this[nm] = 2
      this[upt] = undefined
      this[uct] = undefined
      this[cfr] = this.response.stop_reason
      this[rt] = this.invokeInput.body.temperature
    } else if (this.isAi21() === true) {
      this[utt] = undefined
      this[nm] = 1 + this.response.completions.length
      this[upt] = undefined
      this[uct] = undefined
      this[cfr] = this.response.results?.[0]?.finishReason.reason
      this[rt] = this.invokeInput.body.temperature
    } else if (this.isCohere() === true) {
      this[utt] = undefined
      this[nm] = 1 + this.response.generations.length
      this[upt] = undefined
      this[uct] = undefined
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
