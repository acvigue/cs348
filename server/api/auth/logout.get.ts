import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Logout user',
    description: 'Clear the user session and log out',
    security: [{ sessionAuth: [] }],
    responses: {
      200: {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { type: 'object' }
              }
            }
          }
        }
      },
      401: responses[401]
    }
  }
})

export default defineEventHandler(async (event) => {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  await event.context.session.clear()

  return {
    status: 200,
    body: {}
  }
})
