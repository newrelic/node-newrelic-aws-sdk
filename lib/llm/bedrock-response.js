/*
 * Copyright 2024 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

/**
 * @typedef {object} AwsBedrockMiddlewareResponse
 * @property {object} response Has a `body` property that is an IncomingMessage,
 * a `headers` property that are the response headers, a `reason` property that
 * indicates the status code reason, and a `statusCode` property.
 * @property {object} output Has a `$metadata` property that includes the
 * `requestId`, and a `body` property that is a Uint8Array representation
 * of the response payload.
 */

class BedrockResponse {
  #innerResponse
  #innerOutput
  #parsedBody
  #command
  #completions = []
  #id

  /**
   * @param {object} params
   * @param {AwsBedrockMiddlewareResponse} params.response
   * @param {BedrockCommand} params.bedrockCommand
   */
  constructor({ response, bedrockCommand }) {
    this.#innerResponse = response.response
    this.#innerOutput = response.output
    this.#command = bedrockCommand

    const json = new TextDecoder().decode(this.#innerOutput.body)
    this.#parsedBody = JSON.parse(json)

    const cmd = this.#command
    if (cmd.isAi21() === true) {
      this.#completions = this.#parsedBody.completions.map((c) => c.data.text)
      this.#id = this.#parsedBody.id
    } else if (cmd.isClaude() === true) {
      // TODO: can we make this thing give more than one completion?
      this.#completions.push(this.#parsedBody.completion)
    } else if (cmd.isCohere() === true) {
      this.#completions = this.#parsedBody.generations.map((g) => g.text)
      this.#id = this.#parsedBody.id
    } else if (cmd.isTitan() === true) {
      this.#completions = this.#parsedBody.results.map((r) => r.outputText)
    }
  }

  get completions() {
    return this.#completions
  }

  get finishReason() {
    const cmd = this.#command
    let result
    if (cmd.isTitan() === true) {
      result = this.#parsedBody.results?.[0]?.completionReason
    } else if (cmd.isClaude() === true) {
      result = this.#parsedBody.stop_reason
    } else if (cmd.isAi21() === true) {
      result = this.#parsedBody.completions?.[0]?.finishReason.reason
    } else if (cmd.isCohere() === true) {
      result = this.#parsedBody.results?.generations?.[0].finish_reason
    }
    return result
  }

  get headers() {
    return this.#innerResponse.headers
  }

  /**
   * Retrieve the response identifier provided by some model responses.
   *
   * @returns {string|undefined}
   */
  get id() {
    return this.#id
  }

  get requestId() {
    return this.#innerOutput.requestId
  }

  get statusCode() {
    return this.#innerResponse.statusCode
  }
}

module.exports = BedrockResponse
