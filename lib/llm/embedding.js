/*
 * Copyright 2024 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const LlmEvent = require('./event')

/**
 * @typedef {object} LlmEmbeddingParams
 * @augments LlmEventParams
 */
/**
 * @type {LlmEmbeddingParams}
 */
const defaultParams = {}

class LlmEmbedding extends LlmEvent {
  constructor(params = defaultParams) {
    super(params)

    this.input = this.bedrockCommand.prompt
    const utt = 'response.usage.total_tokens'
    const upt = 'response.usage.prompt_tokens'
    this[utt] = this.response.inputTextTokenCount
    this[upt] = this.response.inputTextTokenCount
  }
}

module.exports = LlmEmbedding
