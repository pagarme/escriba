const R = require('ramda')
const cuid = require('cuid')
const { stringify } = require('./utils')
const { parsePropsType } = require('./utils')

const buildLog = (messageBuilder, loggerConf) => (message, level, additional) => {
  const defaultAdditional = R.defaultTo({}, additional)
  message = parsePropsType(message, loggerConf.propsToParse)
  const log = messageBuilder(Object.assign(
    { id: cuid(), message, level },
    defaultAdditional
  ))
  return log
}

const createProxyLevels = (buildLog, logger) => {
  const levels = ['trace', 'fatal', 'debug', 'error', 'warn', 'info']
  return levels.map(lvl => ({ [lvl]: (msg, additional) => (
    logger[lvl](stringify(buildLog(msg, lvl, additional)))
  )}))
}

const logger = (vendorLogger, messageBuilder, loggerConf = {}) => (
  Object.assign({}, ...createProxyLevels(buildLog(messageBuilder, loggerConf), vendorLogger))
)

module.exports = { createLogger: logger }
