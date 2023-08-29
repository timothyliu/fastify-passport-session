const fastifySession = require('@fastify/session')
const MongoDBStore = require('connect-mongodb-session')(fastifySession)
const fastify = require('fastify')()

const store = new MongoDBStore({
    uri: 'mongodb://127.0.0.1:27018/sessionDB?directConnection=true',
    collection: 'sessions',
})
// const store = new MongoDBStore({
//   uri: 'mongodb://127.0.0.1:27018/sessionDB'
// })

fastify.register(require('@fastify/cookie'))
fastify.register(fastifySession, {
  secret: 'a secret with minimum length of 32 characters',
  cookie: {
    secure: false,
    maxAge: 60000,
  },
  store: store
})

fastify.get('/', (req, reply) => {
  req.session.user = {name: 'max'}
  reply.send({hello: 'session'})
})

fastify.get('/test', (req, reply) => {
  console.log(req.session)
  reply.send({test: 'test'})
})

fastify.listen(3000, (err) => {
    if (err) throw err
    console.log(`server listening on ${fastify.server.address().port}`)
})