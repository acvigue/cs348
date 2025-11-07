import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { sendEmail } from '../../../utils/sendEmail'
import { randomBytes } from 'crypto'
import { VerificationTokenType } from '~/generated/prisma/enums'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Send password reset email',
    description: 'Send a password reset email to a user. Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Password reset email sent successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' }
              }
            }
          }
        }
      },
      400: responses[400],
      403: responses[403],
      404: responses[404]
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !isAdmin(user)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const found = await prisma.user.findUnique({ where: { id: Number(id) } })
  if (!found) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!found.email) throw createError({ statusCode: 400, statusMessage: 'User has no email' })

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 2) // 2 hours
  await prisma.verificationToken.upsert({
    where: {
      id: found.id,
      type: VerificationTokenType.PASSWORD_RESET
    },
    update: { expires },
    create: { userId: found.id, token, expires, type: VerificationTokenType.PASSWORD_RESET }
  })
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  await sendEmail({
    to: found.email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
  })
  return { success: true }
})
