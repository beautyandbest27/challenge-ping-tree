const handleRoute = async (req, res, next) => {
  const data = next[req.method]
  if (!data) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  let promise = null
  if (data.middleware) {
    const params = await data.middleware(req)
    promise = data.handler(params)
  } else {
    promise = data.handler()
  }

  promise.then(({ code, result }) => {
    res.writeHead(code)
    if (typeof result === 'string') {
      res.end(result)
    } else if (typeof result === 'object') {
      res.end(JSON.stringify(result))
    } else {
      res.end('ok')
    }
  })
}

const parseBody = req => new Promise((resolve) => {
  let body = ''
  req.on('data', (data) => {
    body += data.toString()
  })

  req.on('end', () => resolve(JSON.parse(body)))
})

module.exports = {
  parseBody,
  handleRoute
}
