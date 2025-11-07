import prisma from '../../prisma'
import { isAdmin } from '../../middleware/session'
import { parameters, responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'List all users',
    description: 'Retrieve a paginated list of all users. Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/UserBasic' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      403: responses[403]
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !isAdmin(user)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { page = 1, results_per_page = 20 } = getQuery(event)
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const perPage = Math.max(1, parseInt(results_per_page as string, 10) || 20)

  const total_results = await prisma.user.count()
  const total_pages = Math.ceil(total_results / perPage)
  const users = await prisma.user.findMany({
    skip: (pageNum - 1) * perPage,
    take: perPage,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return {
    users,
    pagination: {
      page: pageNum,
      total_pages,
      total_results
    }
  }
})
