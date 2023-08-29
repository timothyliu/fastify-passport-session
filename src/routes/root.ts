import { FastifyPluginAsync, RouteHandler } from 'fastify'
import fastifyPassport from '@fastify/passport'
import { SingleStrategyCallback } from '@fastify/passport/dist/AuthenticationRoute'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/',
		{ onRequest: fastify.authPassport },
		async function (request, reply) {
			reply.send({ root: true, user: request.user, userSession: request.session.user })
			return reply
		})
	fastify.get('/auth/logout',
		// { onRequest: fastify.authPassport },
		async function (request, reply): Promise<void> {
			console.log({ query: request.query, body: request.body, args: request.params })
			if (!request.isAuthenticated() || request.session.user === undefined) {
				reply.send('You are not login yet!')
				return
			}
			const user = JSON.parse(JSON.stringify(request.session.user))
			request.logOut()
			request.session.destroy()
			reply.send({ ori: user, user: request.session.user })
			return reply
		})

	const authLoginGoogle: SingleStrategyCallback = async (request, reply, err, user, info, status) => {
		if (err) {
			reply.send(err);
		} else {
			// 將 userInfo 和 tokenSet 存放在 session
			request.session.user = user
			// request.info = info
			// reply.send({ redirectUri, user, info, statuses: status })
		}
	}
	fastify.get('/auth/login/google', { onRequest: fastifyPassport.authenticate('google', { scope: ['email', 'profile']}) },
		async function (request, reply): Promise<void> {
			console.log({ query: request.query, body: request.body, args: request.params })
		}
	)
	fastify.get('/auth/login/callback/google',
		{ onRequest: fastifyPassport.authenticate('google', { scope: ['email', 'profile'], assignProperty: 'user', authInfo: true }, authLoginGoogle) },
		async function (request, reply): Promise<void> {
			console.log({ query: request.query, body: request.body, args: request.params })
			console.log({ user: request.session.user })
			
			const redirectUri = request.session.redirectUri || '/'
			request.session.redirectUri = null // clear redirectUri
			return reply.redirect(redirectUri)
		}
	)

	const authLogin: RouteHandler<{
		Querystring: { redirectUri: string }
	}> = async (request, reply): Promise<void> => {
		console.log({ query: request.query, body: request.body, args: request.params })
		const redirectUri = request.query.redirectUri || '/'
		request.session.redirectUri = redirectUri
		reply.header('Content-Type', 'text/html').send(`<html><body><a href="/auth/login/google">Login with Google</a><br>session: ${JSON.stringify(request.session.user)}</body></html>`)
		return reply

	}
	fastify.get('/auth/login', authLogin)
}

export default root;
