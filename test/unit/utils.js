const log4js = require('log4js').getLogger()
const winston = require('winston')
const ironMask = require('iron-mask')
const maskJson = require('mask-json')

const test = require('ava')
const utils = require('../../src/utils')

test('parseStringToJSON: with a valid JSON string', t => (
  utils.parseStringToJSON(JSON.stringify({ name: 'Papyrus' }))
    .then(result => t.deepEqual(result, { name: 'Papyrus' }))
))

test('parseStringToJSON: with a invalid JSON string', t => (
  utils.parseStringToJSON(JSON.stringify('Papyrus'))
    .then(result => t.is(result, 'Papyrus'))
))

test('stringify: with a valid JSON object', t => {
  t.is(utils.stringify({ name: 'Papyrus' }), '{"name":"Papyrus"}')
})

test('stringify: with a invalid JSON object', t => {
  t.is(utils.stringify('Papyrus'), 'Papyrus')
})

test('stringify: with a valid error object', t => {
  const logStringified = utils.stringify({
    id: 1,
    message: new Error('Error Message')
  })

  const logObject = JSON.parse(logStringified)
  const logError = logObject.message

  t.is(logError.message, 'Error Message')
  t.true(logError.stack.includes('Error: Error Message'))
})

test('generateLogLevel: with status code 400', t => {
  t.is(utils.generateLogLevel(400), 'warn')
})

test('generateLogLevel: with status code 500', t => {
  t.is(utils.generateLogLevel(500), 'error')
})

test('generateLogLevel: with status code 200', t => {
  t.is(utils.generateLogLevel(200), 'info')
})

test('generateLogLevel: with a invalid status code', t => {
  t.is(utils.generateLogLevel(undefined), 'info')
})

test('isVendorLoggerValid: with a log4js instance', t => {
  t.is(utils.isVendorLoggerValid(log4js), true)
})

test('isVendorLoggerValid: with a winston instance', t => {
  t.is(utils.isVendorLoggerValid(winston), true)
})

test('isVendorLoggerValid: with a invalid logger instance', t => {
  t.is(utils.isVendorLoggerValid({ info: () => 1 }), false)
})

test('isIronMaskVendor: with an iron-mask instance', t => {
  t.is(utils.isIronMaskVendor(ironMask), true)
})

test('isIronMaskVendor: with a mask-json instance', t => {
  t.is(utils.isIronMaskVendor(maskJson), false)
})

test('isMaskJsonVendor: with a mask-json instance', t => {
  t.is(utils.isMaskJsonVendor(maskJson), true)
})

test('isMaskJsonVendor: with an iron-mask instance', t => {
  t.is(utils.isMaskJsonVendor(ironMask), false)
})

test('parsePropsType: with a valid propsToParse parameter', t => {
  const reqProps = {
    body: {
      id: 123
    }
  }

  const propsToParse = {
    'body.id': String
  }

  const expectedAssertion = {
    body: {
      id: '123'
    }
  }

  t.deepEqual(utils.parsePropsType(reqProps, propsToParse), expectedAssertion)
})

test('parsePropsType: with an invalid propsToParse parameter', t => {
  const reqProps = {
    body: {
      id: 123
    }
  }

  const propsToParse = {
    'body.foobar': String
  }

  const expectedAssertion = {
    body: {
      id: 123
    }
  }

  t.deepEqual(utils.parsePropsType(reqProps, propsToParse), expectedAssertion)
})
