import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Delete user',
    description: 'Delete a user account. Requires ADMIN role. Cannot delete self.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'User deleted successfully',
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
  if (user.id === Number(id))
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete self' })

  await prisma.user.delete({ where: { id: Number(id) } })
  return { success: true }
})
