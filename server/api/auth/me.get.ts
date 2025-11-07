import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Authentication'],
    summary: 'Get current user',
    description: 'Retrieve information about the currently authenticated user',
    security: [{ sessionAuth: [] }],
    responses: {
      200: {
        description: 'Current user information',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] }
                  }
                }
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

  return {
    status: 200,
    body: {
      id: event.context.user.id,
      email: event.context.user.email,
      role: event.context.user.role
    }
  }
})
