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

/**
 * @typedef {object} LlmEmbeddingCreateParams
 * @augments LlmEmbeddingParams
 * @property {object} awsClient An AWS SDK client instance.
 */
/**
 * @type LlmEmbeddingCreateParams
 */
const createDefaultParams = {
  ...defaultParams,
  awsClient: {}
}

class LlmEmbedding extends LlmEvent {
  constructor(params = defaultParams) {
    super(params)

    // TODO: probably need to inspect the model id first
    this.input = this.invokeInput.body?.inputText
    const utt = 'response.usage.total_tokens'
    const upt = 'response.usage.prompt_tokens'
    this[utt] = this.response.inputTextTokenCount
    this[upt] = this.response.inputTextTokenCount
  }

  /**
   * Create a new LlmChatCompletionSummary with AWS specific information
   * added. Specifically, it gets the credentials from the client and adds the
   * last four digits of the access key to the message.
   *
   * @param {LlmEmbeddingCreateParams} params
   *
   * @returns {Promise<LlmEmbedding>}
   */
  static async create(params = createDefaultParams) {
    const { awsClient } = params
    const event = new LlmEmbedding(params)
    await event.addKeyDigits(awsClient)
    return event
  }
}

module.exports = LlmEmbedding
