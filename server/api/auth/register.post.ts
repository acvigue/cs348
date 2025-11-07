import { hash } from 'bcrypt'
import { z } from 'zod'
import prisma from '../../prisma'
import { sendEmail } from '../../utils/sendEmail'
import { randomBytes } from 'crypto'
import { VerificationTokenType } from '~/generated/prisma/enums'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Register new user',
    description: 'Create a new user account and send verification email',
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

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24)

  const user = await prisma.user
    .create({
      data: {
        email: body.email,
        password: await hash(body.password, 12),
        name: body.name,
        verificationTokens: {
          create: [
            {
              token,
              expires,
              type: VerificationTokenType.EMAIL_VERIFICATION
            }
          ]
        }
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

  // Send verification email
  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/verify?token=${token}`

  await sendEmail({
    to: user.email,
    subject: 'Verify your email',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
  })

  return {
    status: 201,
    body: {
      id: user.id,
      email: user.email
    }
  }
})
