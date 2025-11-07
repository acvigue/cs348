import { compare } from 'bcrypt'
import { z } from 'zod'
import prisma from '../../prisma'
import { VerificationTokenType } from '~/generated/prisma/enums'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'User login',
    description: 'Authenticate a user with email and password',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', description: 'User email address' },
              password: {
                type: 'string',
                description: 'User password (minimum 8 characters)'
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', description: 'User ID' },
                    email: { type: 'string', format: 'email', description: 'User email' }
                  }
                }
              }
            }
          }
        }
      },
      401: responses[401],
      403: {
        description: 'Email not verified',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      500: responses[500]
    }
  }
})

export default defineEventHandler(async (event) => {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })

  const body = await readValidatedBody(event, loginSchema.parse)

  const user = await prisma.user.findFirst({
    where: {
      email: body.email
    },
    include: {
      verificationTokens: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  if (
    user.verificationTokens.some((token) => token.type === VerificationTokenType.EMAIL_VERIFICATION)
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Email not verified'
    })
  }

  // validate password
  const valid = await compare(body.password, user.password!)

  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  await event.context.session.update({
    user_id: user.id
  })

  return {
    status: 200,
    body: {
      id: user.id,
      email: user.email
    }
  }
})
