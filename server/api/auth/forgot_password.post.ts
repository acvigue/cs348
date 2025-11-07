import { z } from 'zod'
import prisma from '../../prisma'
import { sendEmail } from '../../utils/sendEmail'
import { randomBytes } from 'crypto'
import { VerificationTokenType } from '~/generated/prisma/enums'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Request password reset',
    description: 'Send a password reset email to the user',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email', description: 'User email address' }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Password reset email sent (if account exists)',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 201 },
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
      }
    }
  }
})

export default defineEventHandler(async (event) => {
  const registerUserSchema = z.object({
    email: z.email()
  })

  const body = await readValidatedBody(event, registerUserSchema.parse)

  const user = await prisma.user.findFirst({
    where: {
      email: body.email
    }
  })

  if (user) {
    // Send verification email
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24)
    await prisma.verificationToken.create({
      data: {
        user: {
          connect: { id: user.id }
        },
        token,
        expires,
        type: VerificationTokenType.PASSWORD_RESET
      }
    })

    const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/verify?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
    })
  }

  return {
    status: 201,
    body: { message: 'If an account with that email exists, a verification email has been sent.' }
  }
})
