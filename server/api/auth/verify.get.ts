import { VerificationTokenType } from '~/generated/prisma/enums'
import prisma from '../../prisma'
import { parameters, responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Verify email or password reset token',
    description: 'Verify email address or redirect to password reset page based on token type',
    parameters: [parameters.token],
    responses: {
      302: {
        description: 'Redirect to login page (email verified) or reset password page'
      },
      400: responses[400]
    }
  }
})

export default defineEventHandler(async (event) => {
  const rawToken = getQuery(event).token
  const token = typeof rawToken === 'string' ? rawToken : Array.isArray(rawToken) ? rawToken[0] : ''
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  }

  const verification = await prisma.verificationToken.findUnique({ where: { token } })
  if (!verification || verification.expires < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  if (verification.type === VerificationTokenType.EMAIL_VERIFICATION) {
    await prisma.verificationToken.delete({ where: { token } })
    return sendRedirect(event, '/auth/login?msg=verified')
  } else if (verification.type === VerificationTokenType.PASSWORD_RESET) {
    return sendRedirect(event, `/auth/reset_password?token=${token}`)
  }
})
