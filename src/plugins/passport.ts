/* eslint-disable camelcase */
'use strict'

import fastifyPassport from '@fastify/passport'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import { FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify'
import fp from 'fastify-plugin'

import { Strategy as GoogleStrategy, VerifyFunctionWithRequest } from 'passport-google-oauth2'
const MongoDBStore = require('connect-mongodb-session')(fastifySession)



export interface FastifyPassportOptions {
    callbackUri: string;
}

interface User {
    id: string
}

declare module 'fastify' {
	interface FastifyInstance {
		authPassport: RouteHandlerMethod
	}
}
declare module 'fastify' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface PassportUser extends User {}
}

declare module "fastify" {
    interface Session {
        authType: 'google' | 'n1auth'
        user_id: string
        user: any
        id?: number
        redirectUri?: string | null
    }
}

export default fp<FastifyPassportOptions>(async (fastify, opts) => {

	const SESSION_SECRET = process.env.SESSION_SECRET || '01234567890123456789012345678901'

    const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || ''
    const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
    const MAX_SESSION_AGE = 1000 * 60 * 60 * 24 * 1 // 1 days
    const SESSION_DB_URI = process.env.SESSION_DB_URI || 'mongodb://127.0.0.1:27017/sessionDB?directConnection=true'
    
    fastify.register(fastifyCookie, {
		secret: 'my-secret', // for cookies signature
		parseOptions: {
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
        },     // options for parsing cookies
	})

    const store = new MongoDBStore({
        uri: SESSION_DB_URI,
        collection: 'sessions',
    })

	fastify.register(fastifySession, { 
        secret: SESSION_SECRET, 
        cookie: { 
            path: '/', 
            httpOnly: true, 
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: MAX_SESSION_AGE,
        }, 
        saveUninitialized: false,
        store: store,
        rolling: false,
    })

	// initialize @fastify/passport and connect it to the secure-session storage. Note: both of these plugins are mandatory.
	fastify.register(fastifyPassport.initialize())
	fastify.register(fastifyPassport.secureSession())

    const googleVerify: VerifyFunctionWithRequest = (request, accessToken, refreshToken, profile, done) => {
        console.log('googleVerify: ', accessToken, refreshToken, profile)
        return done(null, {accessToken, refreshToken, profile})
    }
    const googleStrategy = new GoogleStrategy({
        clientID: GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/login/callback/google",
        passReqToCallback: true,
        scope: ['email', 'profile'],
    }, googleVerify)
    fastifyPassport.use('google', googleStrategy );
    
    
    const authPassport: RouteHandlerMethod = async (request: FastifyRequest, reply: FastifyReply ) => {
        console.log('authPassport: ', request.url)
        if (!request.url.startsWith('/auth/login') && !request.session.user) {
            return reply.redirect('/auth/login?redirectUri=' + encodeURIComponent(`${request.url}`))
        }
    }
    fastify.decorate('authPassport', authPassport)
})

