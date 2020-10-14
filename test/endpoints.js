process.env.NODE_ENV = 'test'

const test = require('ava')
const servertest = require('servertest')

const server = require('../lib/server')

test.serial.cb('healthcheck', function (t) {
  const url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Get /api/targets -All Targets', function (t) {
  const url = '/api/targets'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Get /api/target/1 -Target By Id', function (t) {
  const url = '/api/target/1'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

const streamTest = (stream, obj) => {
  stream.write(JSON.stringify(obj))
  stream.end()
}

test.serial.cb('POST /api/targets -Add or Update Target', t => {
  const data = {
    id: '1',
    url: 'http://example.com',
    value: '0.50',
    maxAcceptsPerDay: '50000',
    accept: {
      geoState: {
        $in: ['ca', 'ny']
      },
      hour: {
        $in: ['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24']
      }
    }
  }
  const url = '/api/targets'
  streamTest(servertest(server(), url, { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.deepEqual(response, {
      status: 'OK'
    })
    t.is(res.statusCode, 200, 'correct statusCode')
    t.end()
  }), data)
})

test.serial.cb('Post /route -Get Route ca as geostate and 00 hour', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T23:28:59.513Z'
  }
  streamTest(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200)
    t.is(response.status, 'OK', 'status is ok')
    t.end()
  }), visitor)
})

test.serial.cb('Post /route -Get Route with no ca match', (t) => {
  const visitor = {
    geoState: 'uk',
    publisher: 'abc',
    timestamp: '2018-07-19T23:28:59.513Z'
  }
  streamTest(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 503)
    t.deepEqual(response, { status: 'fail', error: 'reject', decision: 'reject' })
    t.end()
  }), visitor)
})

test.serial.cb('Post /route -Get Route with no hour match', (t) => {
  const visitor = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T10:28:59.513Z'
  }
  streamTest(servertest(server(), '/route', { method: 'POST' }, (err, res) => {
    const response = JSON.parse(res.body.toString())
    t.falsy(err, 'no error')
    t.is(res.statusCode, 503)
    t.deepEqual(response, { status: 'fail', error: 'reject', decision: 'reject' })
    t.end()
  }), visitor)
})
