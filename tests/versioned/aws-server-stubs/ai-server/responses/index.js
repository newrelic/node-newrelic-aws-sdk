/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const ai21 = require('./ai21')
const amazon = require('./amazon')
const claude = require('./claude')
const cohere = require('./cohere')

module.exports = {
  ai21,
  amazon,
  claude,
  cohere
}
