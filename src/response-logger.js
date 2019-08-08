const R = require('ramda')
const {
  parseStringToJSON,
  pickProperties,
  generateLogLevel,
  stringify,
  filterLargeBody
} = require('./utils')

const buildResLog = (propsToLog, bodyLengthLimit) => ({ req, res }) => {
  const level = generateLogLevel(res.statusCode)

  const reqProps = R.merge(
    pickProperties(req, propsToLog),
    pickProperties(req.headers, propsToLog)
  )
  const env = pickProperties(process.env, propsToLog)

  const resProps = pickProperties(res, propsToLog)
  resProps.body = filterLargeBody(resProps.body, bodyLengthLimit)

  const reqResProps = pickProperties(
    {
      req,
      res
    },
    propsToLog
  )

  return R.mergeAll([
    reqProps,
    resProps,
    reqResProps,
    {
      level,
      from: 'response',
      env
    }
  ])
}

const loggerByStatusCode = logger => message => {
  logger[message.level](stringify(message))
  return message
}

const prepareResLog = (req, res, buffer) => (
  parseStringToJSON(buffer.toString())
    .then(body => ({
      req,
      res: R.merge(res, { body })
    }))
)

const addLatency = (req, propsToLog) => message => {
  if (!R.contains('latency', propsToLog)) return message
  return R.merge(message, { latency: message.startTime - req.startTime })
}

const captureLog = ({
  http,
  propsToLog,
  skipper,
  logger,
  messageBuilder,
  bodyLengthLimit
}) => {
  const { req, res } = http
  const { write, end } = res
  const chunks = []
  const shouldSkipChunk = skipper(req.url, req.method, true)

  res.write = chunk => {
    if (!shouldSkipChunk) chunks.push(Buffer.from(chunk))
    write.call(res, chunk)
  }

  res.end = chunk => {
    if (chunk && !shouldSkipChunk) chunks.push(Buffer.from(chunk))
    prepareResLog(req, res, Buffer.concat(chunks))
      .then(buildResLog(propsToLog, bodyLengthLimit))
      .then(messageBuilder)
      .then(addLatency(req, propsToLog))
      .then(loggerByStatusCode(logger))

    end.call(res, chunk)
  }

  return res
}

const responseLogger = ({
  logger,
  messageBuilder,
  propsToLog,
  skipper,
  bodyLengthLimit
}) => (req, res) => (
  captureLog({
    http: { req, res },
    propsToLog,
    skipper,
    logger,
    messageBuilder,
    bodyLengthLimit
  })
)

module.exports = {
  createResponseLogger: responseLogger,
  buildResLog
}
