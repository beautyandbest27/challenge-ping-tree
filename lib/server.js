const URL = require('url')
const http = require('http')
const cuid = require('cuid')
const Corsify = require('corsify')
const sendJson = require('send-data/json')
const ReqLogger = require('req-logger')
const healthPoint = require('healthpoint')
const HttpHashRouter = require('http-hash-router')

const redis = require('./redis')
const version = require('../package.json').version

const router = HttpHashRouter()
const logger = ReqLogger({ version: version })
const health = healthPoint({ version: version }, redis.healthCheck)
const cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

const { getTargetsHandle, getTargetByIdHandle, addOrUpdateTargetHandle, filterHandle } = require('../src/api')
const { handleRoute, parseBody } = require('../src/utils')

router.set('/favicon.ico', empty)

module.exports = function createServer () {
  return http.createServer(cors(handler))
}

function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    // console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  const logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}

router.set('/api/targets', (req, res) => handleRoute(req, res, {
  POST: {
    middleware: async req => parseBody(req),
    handler: addOrUpdateTargetHandle
  },
  GET: {
    handler: getTargetsHandle
  }
}))

router.set('/api/target/:id', (req, res) => handleRoute(req, res, {
  GET: {
    middleware: async req => req.url.split('/').pop(),
    handler: (id) => getTargetByIdHandle(id)
  }
}))

router.set('/route', (req, res) => handleRoute(req, res, {
  POST: {
    middleware: async req => parseBody(req),
    handler: filterHandle
  }
}))
