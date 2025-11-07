import prisma from '../../../prisma'
import { LabAvailability } from '~/generated/prisma/enums'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'Get lab by ID',
    description: 'Retrieve detailed information about a specific lab',
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Lab details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { $ref: '#/components/schemas/LabWithEquipment' }
              }
            }
          }
        }
      },
      400: responses[400],
      404: responses[404],
      500: responses[500]
    }
  }
})

export default defineEventHandler(async (event) => {
  const labId = getRouterParam(event, 'id')

  if (!labId || isNaN(Number(labId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid lab ID'
    })
  }

  try {
    const lab = await prisma.lab.findUnique({
      where: {
        id: Number(labId)
      },
      include: {
        equipment: {
          include: {
            reservationLinks: {
              where: {
                reservation: {
                  status: {
                    in: ['CONFIRMED', 'IN_PROGRESS']
                  },
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
          }
        },
        _count: {
          select: {
            equipment: true
          }
        }
      }
    })

    if (!lab) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lab not found'
      })
    }

    // Compute LabAvailability enum: EMPTY (all available), FULL (all unavailable), IN_USE (some available)
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
    return {
      status: 200,
      body: { ...lab, availability }
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lab'
    })
  }
})
