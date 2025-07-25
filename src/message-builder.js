const os = require('os')
const R = require('ramda')
const moment = require('moment-timezone')

const { log: applyIntegrations } = require('./integrations')

const generateDefaultProps = (service, ddtags, integrations) => applyIntegrations({
  service,
  ddtags,
  startTime: moment().valueOf(),
  hostname: os.hostname(),
  pid: process.pid
}, integrations)

const filterMessage = R.filter(prop => !R.isNil(prop))

const builder = (messageMasker, service, ddtags, integrations) => (message, propsToLog) => (
  filterMessage(messageMasker(R.merge(generateDefaultProps(service, ddtags, integrations), message)))
)

module.exports = { createMessageBuilder: builder }
