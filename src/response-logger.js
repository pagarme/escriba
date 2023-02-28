const R = require('ramda')
const {
  parseStringToJSON,
  pickProperties,
  generateLogLevel,
  stringify,
  filterLargeProp,
  filterLargeUrl,
  parsePropsType
} = require('./utils')

const buildResLog = (
  propsToLog,
  propMaxLength = {},
  propsToParse = {}
) => ({ req, res }) => {
  const level = generateLogLevel(res.statusCode)

  const reqProps = R.merge(
    pickProperties(req, propsToLog),
    pickProperties(req.headers, propsToLog)
  )
  const env = pickProperties(process.env, propsToLog)

  const resProps = pickProperties(res, propsToLog)

  resProps.body = filterLargeProp(resProps.body, propMaxLength.body)
  reqProps.url = req.originalUrl || req.url
  reqProps.url = filterLargeUrl(reqProps.url, propMaxLength.url)

  const reqParsedProps = parsePropsType(reqProps, propsToParse.response)
  const resParsedProps = parsePropsType(resProps, propsToParse.response)
  const reqResProps = pickProperties(
    {
      req,
      res
    },
    propsToLog
  )

  return R.mergeAll([
    reqParsedProps,
    resParsedProps,
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
  propMaxLength,
  propsToParse
}) => {
  const { req, res } = http
  const { write, end } = res
  const chunks = []
  const path = req.originalUrl.replace(/(\?|\#).*$/, '')
  const shouldSkipChunk = skipper(path, req.method, true)

  res.write = chunk => {
    if (!shouldSkipChunk) chunks.push(Buffer.from(chunk))
    write.call(res, chunk)
  }

  res.end = chunk => {
    if (chunk && !shouldSkipChunk) chunks.push(Buffer.from(chunk))
    prepareResLog(req, res, Buffer.concat(chunks))
      .then(buildResLog(propsToLog, propMaxLength, propsToParse))
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
  response: propsToLog,
  skipper,
  propMaxLength,
  propsToParse
}) => (req, res) => (
  captureLog({
    http: { req, res },
    propsToLog,
    skipper,
    logger,
    messageBuilder,
    propMaxLength,
    propsToParse
  })
)

module.exports = {
  createResponseLogger: responseLogger,
  buildResLog
}
