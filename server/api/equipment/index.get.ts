import prisma from '../../prisma'
import { parameters, responses } from '../../utils/openapi'
import { addComputedStatusToMany } from '../../utils/equipmentStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'List all equipment',
    description:
      'Retrieve a paginated list of all equipment with their associated labs and active reservations. Status is computed based on current reservations.',
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of equipment',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                equipment: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/EquipmentWithLab' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      500: responses[500]
    }
  }
})

export default defineEventHandler(async (event) => {
  try {
    const { page = 1, results_per_page = 20 } = getQuery(event)
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const perPage = Math.max(1, parseInt(results_per_page as string, 10) || 20)
    const total_results = await prisma.equipment.count()
    const total_pages = Math.ceil(total_results / perPage)
    const equipment = await prisma.equipment.findMany({
      skip: (pageNum - 1) * perPage,
      take: perPage,
      include: {
        lab: true,
        reservationLinks: {
          where: {
            reservation: {
              status: 'CONFIRMED',
              endTime: {
                gte: new Date()
              }
            }
          },
          include: {
            reservation: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Add computed status to each equipment
    const equipmentWithStatus = addComputedStatusToMany(equipment)

    return {
      equipment: equipmentWithStatus,
      pagination: {
        page: pageNum,
        total_pages,
        total_results
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch equipment'
    })
  }
})
