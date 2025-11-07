import prisma from '../../prisma'
import { LabAvailability } from '~/generated/prisma/enums'
import { parameters, responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'List all labs',
    description: 'Retrieve a paginated list of all labs with equipment counts and availability',
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of labs',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                labs: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/LabWithEquipment' }
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
    const total_results = await prisma.lab.count()
    const total_pages = Math.ceil(total_results / perPage)
    const labs = await prisma.lab.findMany({
      skip: (pageNum - 1) * perPage,
      take: perPage,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        },
        _count: {
          select: {
            equipment: true
          }
        }
      },
      orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }]
    })

    // Compute LabAvailability enum: EMPTY (all available), FULL (all unavailable), IN_USE (some available)
    const labsWithAvailability = await Promise.all(
      labs.map(async (lab) => {
        const equipmentIds = lab.equipment.map((e) => e.id)
        let availableCount = 0
        let unavailableCount = 0
        if (equipmentIds.length > 0) {
          availableCount = await prisma.equipment.count({
            where: {
              id: { in: equipmentIds },
              status: 'AVAILABLE'
            }
          })
          unavailableCount = equipmentIds.length - availableCount
        }
        let availability: LabAvailability = LabAvailability.EMPTY
        if (availableCount === 0 && equipmentIds.length > 0) {
          availability = LabAvailability.FULL
        } else if (availableCount > 0 && unavailableCount > 0) {
          availability = LabAvailability.IN_USE
        } else if (availableCount === equipmentIds.length && equipmentIds.length > 0) {
          availability = LabAvailability.EMPTY
        }
        return { ...lab, availability }
      })
    )

    return {
      labs: labsWithAvailability,
      pagination: {
        page: pageNum,
        total_pages,
        total_results
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch labs'
    })
  }
})
