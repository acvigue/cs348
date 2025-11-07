import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { VerificationTokenType } from '~/generated/prisma/enums'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Verify user email',
    description:
      'Remove email verification tokens for a user (marks as verified). Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'User verified successfully',
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
      403: responses[403]
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !isAdmin(user)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  await prisma.verificationToken.deleteMany({
    where: { userId: Number(id), type: VerificationTokenType.EMAIL_VERIFICATION }
  })
  return { success: true }
})
