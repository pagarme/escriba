const ironMask = require('iron-mask')

const { loadIntegrations } = require('./integrations')
const { createMask } = require('./mask')
const { createLogger } = require('./logger')
const { createHttpLogger } = require('./http-logger')
const { isVendorLoggerValid, isVendorMaskValid } = require('./utils')
const { createMessageBuilder } = require('./message-builder')

const escriba = config => {
  const {
    service,
    loggerEngine,
    sensitive,
    httpConf,
    loggerConf,
    maskEngine,
    integrations
  } = config

  if (!isVendorLoggerValid(loggerEngine)) {
    throw new Error('You must pass a valid logger library. We accept log4js and winston libraries.')
  }

  const mask = maskEngine || ironMask

  if (!isVendorMaskValid(mask)) {
    throw new Error('You must pass a valid mask library. We accept iron-mask and mask-json libraries.')
  }

  loadIntegrations(integrations)

  const messageMasker = createMask(mask, sensitive)
  const messageBuilder = createMessageBuilder(messageMasker, service, integrations)
  const logger = createLogger(loggerEngine, messageBuilder, loggerConf)
  const httpLogger = createHttpLogger(loggerEngine, messageBuilder, httpConf || {})
  return { logger, httpLogger }
}

module.exports = escriba
