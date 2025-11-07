import prisma from '../../prisma'
import { isAdmin } from '../../middleware/session'
import { parameters, responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Reservations'],
    summary: 'List reservations',
    description:
      'Retrieve a paginated list of reservations. Admins see all, users see only their own.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of reservations',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reservations: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ReservationWithDetails' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
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
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { page = 1, results_per_page = 20 } = getQuery(event)
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const perPage = Math.max(1, parseInt(results_per_page as string, 10) || 20)
  let where = {}
  if (!isAdmin(user)) {
    where = { userId: user.id }
  }
  const total_results = await prisma.reservation.count({ where })
  const total_pages = Math.ceil(total_results / perPage)
  const reservations = await prisma.reservation.findMany({
    where,
    skip: (pageNum - 1) * perPage,
    take: perPage,
    include: {
      equipment: {
        include: {
          equipment: true
        }
      },
      user: true
    },
    orderBy: { startTime: 'desc' }
  })
  return {
    reservations,
    pagination: {
      page: pageNum,
      total_pages,
      total_results
    }
  }
})
