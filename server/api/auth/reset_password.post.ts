import { hash } from 'bcrypt'
import { z } from 'zod'
import prisma from '../../prisma'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Reset password',
    description: 'Reset user password using a valid reset token',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['token', 'password', 'verify_password'],
            properties: {
              token: { type: 'string', description: 'Password reset token' },
              password: { type: 'string', description: 'New password (minimum 8 characters)' },
              verify_password: { type: 'string', description: 'Password confirmation' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Password reset successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      400: responses[400]
    }
  }
})

export default defineEventHandler(async (event) => {
  const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8),
    verify_password: z.string().min(8)
  })

  const body = await readValidatedBody(event, resetPasswordSchema.parse)

  if (body.password !== body.verify_password) {
    throw createError({ statusCode: 400, statusMessage: 'Passwords do not match' })
  }

  const verification = await prisma.verificationToken.findUnique({ where: { token: body.token } })
  if (!verification || verification.expires < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  const user = await prisma.user.findFirst({
    where: {
      id: verification.userId
    }
  })

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hash(body.password, 12)
      }
    })

    await prisma.verificationToken.delete({ where: { token: body.token } })
    return { status: 200, body: { message: 'Password reset successful' } }
  } else {
    throw createError({ statusCode: 400, statusMessage: 'User not found' })
  }
})
