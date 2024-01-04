/*
 * Copyright 2024 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * Parses an AWS invoke command instance into a re-usable entity.
 */
class BedrockCommand {
  #input
  #body
  #modelId

  /**
   * @param {object} params
   * @param {object} params.invokeCommand The InvokeModelCommand or
   * InvokeModelWithResponseStreamCommand instance that is used for the
   * conversation.
   */
  constructor({ invokeCommand }) {
    this.#input = invokeCommand.input
    this.#body = JSON.parse(this.#input.body)
    this.#modelId = this.#input.modelId.toLowerCase()
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
   * The maximum number of tokens allowed as defined by the user.
   */
  get maxTokens() {
    let result
    if (this.isTitan() === true) {
      result = this.#body.textGenerationConfig?.maxTokenCount
    } else if (this.isClaude() === true) {
      result = this.#body.max_tokens_to_sample
    } else if (this.isAi21() === true) {
      result = this.#body.maxTokens
    } else if (this.isCohere() === true) {
      result = this.#body.max_tokens
    }
    return result
  }

  get modelId() {
    return this.#modelId
  }

  get prompt() {
    let result
    if (this.isTitan() === true || this.isTitanEmbed() === true) {
      result = this.#body.inputText
    } else if (this.isClaude() === true || this.isAi21() === true || this.isCohere() === true) {
      result = this.#body.prompt
    }
    return result
  }

  get temperature() {
    let result
    if (this.isTitan() === true) {
      result = this.#body?.textGenerationConfig.temperature
    } else if (this.isClaude() === true || this.isAi21() === true || this.isCohere() === true) {
      result = this.#body.temperature
    }
    return result
  }

  isAi21() {
    return this.#modelId.startsWith('ai21.')
  }

  isClaude() {
    return this.#modelId.startsWith('anthropic.claude')
  }

  isCohere() {
    return this.#modelId.startsWith('cohere.')
  }

  isCohereEmbed() {
    return this.#modelId.startsWith('cohere.embed')
  }

  isTitan() {
    return this.#modelId.startsWith('amazon.titan')
  }

  isTitanEmbed() {
    return this.#modelId.startsWith('amazon.titan-embed')
  }
}

module.exports = BedrockCommand
