import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Get user by ID',
    description: 'Retrieve detailed information about a specific user. Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'User details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' }
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

  const found = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { verificationTokens: true }
  })
  if (!found) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { user: found }
})
