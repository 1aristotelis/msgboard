
require('dotenv').config()

import config from './config'

import { Server } from '@hapi/hapi'

import { log } from './log'

import { join } from 'path'

const Joi = require('joi')

const Pack = require('../package');

import { load } from './server/handlers'

const handlers = load(join(__dirname, './server/handlers'))

export const server = new Server({
  host: config.get('host'),
  port: config.get('port'),
  routes: {
    cors: true,
    validate: {
      options: {
        stripUnknown: true
      }
    }
  }
});

if (config.get('prometheus_enabled')) {

  log.info('server.metrics.prometheus', { path: '/metrics' })

  const { register: prometheus } = require('./metrics')

  server.route({
    method: 'GET',
    path: '/metrics',
    handler: async (req, h) => {
      return h.response(await prometheus.metrics())
    },
    options: {
      description: 'Prometheus Metrics about Node.js Process & Business-Level Metrics',
      tags: ['system']
    }
  })

}

const Post = Joi.object().label('Post')
const Posts = Joi.array().items(Post).label('Posts')

const Link = Joi.object({
  name: Joi.string().required(),
  href: Joi.string().required()
}).label('Link')
const Links = Joi.array().items(Link).label('Links')

const Output = Joi.object({
  script: Joi.string().required(),
  value: Joi.number().optional()
}).label('Output')
const Outputs = Joi.array().items(Output).label('Outputs')

server.route({
  method: 'GET', path: '/api/v0/status',
  handler: handlers.Status.index,
  options: {
    description: 'Simply check to see that the server is online and responding',
    tags: ['api', 'system'],
    response: {
      failAction: 'log',
      schema: Joi.object({
        status: Joi.string().valid('OK', 'ERROR').required(),
        error: Joi.string().optional()
      }).label('ServerStatus')
    }
  }
})

server.route({
  method: 'POST',
  path: '/api/v1/posts/new',
  handler: handlers.Posts.build,//TODO
  options: {
    description: 'Returns required Transaction Outputs for a messageboard post',
    tags: ['api', 'posts'],
    response: {
      failAction: 'log',
      schema: Joi.object({
        outputs: Outputs.required(),
        error: Joi.string().optional()
      }).label('BuildPostResponse')
    }
  }
})

server.route({
  method: 'POST',
  path: '/api/v1/posts',
  handler: handlers.Posts.create,//TODO
  options: {
    description: 'Submit signed bitcoin transaction containing post',
    tags: ['api', 'posts'],
    response: {
      failAction: 'log',
      schema: Joi.object({
        outputs: Outputs.required(),
        error: Joi.string().optional()
      }).label('MsgBoardTransaction')
    }
  }
})

server.route({
  method: 'GET',
  path: '/api/v1/posts',
  handler: handlers.Posts.index,//TODO
  options: {
    description: 'List all Posts Ranked by Proof of Work',
    tags: ['api', 'posts'],
    validate: {
      query: Joi.object({
        start_timestamp: Joi.number().integer().optional(),
        end_timestamp: Joi.number().integer().optional()
      })
      .label('ListPostsQuery')
    },
    response: {
      failAction: 'log',
      schema: Joi.object({
        posts: Posts.label('Posts').required()
      }).label('ListPostsResponse')
    }
  }
})

server.route({
  method: 'GET',
  path: '/api/v1/posts/{tx_id}',
  handler: handlers.Posts.show,//TODO
  options: {
    description: 'Show a Question with Answers and Work',
    tags: ['api', 'questions'],
    response: {
      failAction: 'log',
      schema: Joi.object({
        post: Posts.required(),
        replies: Posts.required(),
        work: Joi.number().required(),
        links: Links.required()
      }).label('ShowQuestionResponse')
    }
  }
})

server.route({
  method: 'GET',
  path: '/api/v1/boostpow/{tx_id}/new',
  handler: handlers.Boostpow.build,
  options: {
    description: 'Create new Boost Pow job script for payment',
    tags: ['api', 'boostpow'],
    validate: {
      query: Joi.object({
        currency: Joi.string().default('USD').optional(),
        value: Joi.number().default(0.05).optional()
      }).label('NewBoostPowOptions'),
      params: Joi.object({
        tx_id: Joi.string().required()
      })
    },
    response: {
      failAction: 'log',
      schema: Joi.object({
        network: Joi.string().required(),
        outputs: Joi.array().items(Joi.object({
          script: Joi.string().required(),
          amount: Joi.number().integer().required()
        }).required().label('PaymentRequestOutput')).required(),
        creationTimestamp: Joi.number().integer().required(),
        expirationTimestamp: Joi.number().integer().required(),
        memo: Joi.string().optional(),
        paymentUrl: Joi.string().required(),
        merchantData: Joi.string().optional()
      })
        
    }
  }
})

server.route({
  method: 'POST',
  path: '/api/v1/transactions',
  handler: handlers.Transactions.create,
  options: {
    description: 'Submit new, signed transactions to the network',
    tags: ['api', 'transactions'],
    validate: {
      failAction: 'log',
      payload: Joi.object({
        transaction: Joi.string().required()
      }).label('SubmitTransaction')
    },
    response: {
      failAction: 'log',
      schema: Joi.object({
        payment: Joi.string().required(),
        memo: Joi.string().optional(),
        error: Joi.number().optional()
      }).label('PaymentAck')
    }

  }
})



var started = false

export async function start() {

  if (started) return;

  started = true

  if (config.get('swagger_enabled')) {

    const swaggerOptions = {
      info: {
        title: 'API Docs',
        version: Pack.version,
        description: 'Developer API Documentation \n\n *** DEVELOPERS *** \n\n Edit this file under `swaggerOptions` in `src/server.ts` to better describe your service.'
      },
      schemes: ['https'],
      host: 'http://localhost:8000',
      documentationPath: '/',
      grouping: 'tags'
    }

    const Inert = require('@hapi/inert');

    const Vision = require('@hapi/vision');

    const HapiSwagger = require('hapi-swagger');

    await server.register([
        Inert,
        Vision,
        {
          plugin: HapiSwagger,
          options: swaggerOptions
        }
    ]);

    log.info('server.api.documentation.swagger', swaggerOptions)
  }

  await server.start();

  log.info(server.info)

  return server;

}

if (require.main === module) {

  start()

}
