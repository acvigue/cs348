import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Update user email',
    description: 'Update a user email address. Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email', description: 'New email address' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Email updated successfully',
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
  const body = await readBody(event)
  const { email } = body
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Missing email' })

  await prisma.user.update({ where: { id: Number(id) }, data: { email } })
  return { success: true }
})
