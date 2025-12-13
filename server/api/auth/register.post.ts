import { hash } from 'bcrypt'
import { z } from 'zod'
import prisma from '../../prisma'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Register new user',
    description: 'Create a new user account',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'password', 'verify_password'],
            properties: {
              name: { type: 'string', description: 'User full name' },
              email: { type: 'string', format: 'email', description: 'User email address' },
              password: { type: 'string', description: 'Password (minimum 8 characters)' },
              verify_password: { type: 'string', description: 'Password confirmation' }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'User created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 201 },
                body: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string', format: 'email' }
                  }
                }
              }
            }
          }
        }
      },
      400: responses[400],
      500: responses[500]
    }
  }
})

export default defineEventHandler(async (event) => {
  const registerUserSchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(8),
    verify_password: z.string().min(8)
  })

  const body = await readValidatedBody(event, registerUserSchema.parse)

  if (body.password !== body.verify_password) {
    throw createError({ statusCode: 400, statusMessage: 'Passwords do not match' })
  }

  const user = await prisma.user
    .create({
      data: {
        email: body.email,
        password: await hash(body.password, 12),
        name: body.name
      }
    })
    .catch((err) => {
      if (err.code === 'P2002') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Email already in use'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Internal server error'
      })
    })

  return {
    status: 201,
    body: {
      id: user.id,
      email: user.email
    }
  }
})
