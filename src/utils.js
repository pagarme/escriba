const R = require('ramda')
const pokeprop = require('pokeprop')
const stringifySafe = require('json-stringify-safe')
const { serializeError } = require('serialize-error')

const parseStringToJSON = chunk => (
  Promise.resolve(chunk)
    .then(JSON.parse)
    .catch(_ => chunk)
)

const stringify = log => {
  if (R.is(String, log)) return log
  if (R.is(Error, log.message)) log.message = serializeError(log.message, { maxDepth: 10 })
  return stringifySafe(log, null, 0, () => '~')
}

const pickProperties = R.flip(pokeprop)

const generateLogLevel = statusCode => {
  if (statusCode < 400 || R.isNil(statusCode)) return 'info'
  if (statusCode < 500) return 'warn'
  return 'error'
}

const isVendorLoggerValid = vendor => {
  if (!R.is(Object, vendor)) return false
  const levels = ['debug', 'error', 'warn', 'info']
  const validationResult = levels.map(level => R.is(Function, vendor[level]))
  return !R.contains(false, validationResult)
}

const isIronMaskVendor = vendor => {
  if (!R.is(Object, vendor)) return false
  if (!R.is(Function, R.path(['create'], vendor))) return false
  if (!R.is(Function, vendor.create({}))) return false
  return true
}

const isMaskJsonVendor = vendor => {
  if (!R.is(Function, vendor)) return false
  if (!R.equals(vendor.length, 1)) return false
  const mask = vendor()
  if (!R.is(Function, mask)) return false
  if (!R.equals(mask.length, 1)) return false
  return true
}

const isVendorMaskValid = maskVendor =>
  isIronMaskVendor(maskVendor) || isMaskJsonVendor(maskVendor)

const filterLargeProp = (prop, propLengthLimit) => {
  if (!prop) return

  if (propLengthLimit === undefined) return prop

  const setDefaultProp = () => Array.isArray(prop) ? [] : {}

  return JSON.stringify(prop).length > propLengthLimit ? setDefaultProp() : prop
}

const filterLargeUrl = (url, urlLengthLimit) => {
  if (!url) return

  if (urlLengthLimit === undefined) return url

  const truncateUrl = () => url.substring(0, urlLengthLimit - 3) + '...'

  return url.length > urlLengthLimit ? truncateUrl(url) : url
}

const parsePropsType = (reqProps, propsType) => {
  const propsTypeKeys = R.keys(propsType)

  if (propsTypeKeys.length === 0) {
    return reqProps
  }

  return propsTypeKeys.reduce((acc, key) => {
    const propPath = key.split('.')
    const reqProp = R.path(propPath, acc)

    if (reqProp !== undefined) {
      const propTypeFunction = propsType[key]
      return R.assocPath(propPath, propTypeFunction(reqProp), acc)
    }

    return acc
  }, reqProps)
}

module.exports = {
  parseStringToJSON,
  pickProperties,
  generateLogLevel,
  isVendorLoggerValid,
  isIronMaskVendor,
  isMaskJsonVendor,
  isVendorMaskValid,
  stringify,
  filterLargeProp,
  filterLargeUrl,
  parsePropsType
}
