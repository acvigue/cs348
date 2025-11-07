import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'
import { addComputedStatus } from '../../../utils/equipmentStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Get equipment by ID',
    description:
      'Retrieve detailed information about a specific equipment item. Status is computed based on current reservations.',
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Equipment details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { $ref: '#/components/schemas/EquipmentWithLab' }
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
  const equipmentId = getRouterParam(event, 'id')

  if (!equipmentId || isNaN(Number(equipmentId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid equipment ID'
    })
  }

  try {
    const equipment = await prisma.equipment.findUnique({
      where: {
        id: Number(equipmentId)
      },
      include: {
        lab: true,
        reservationLinks: {
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
          },
          orderBy: {
            reservation: {
              startTime: 'desc'
            }
          }
        }
      }
    })

    if (!equipment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Equipment not found'
      })
    }

    // Add computed status
    const equipmentWithStatus = addComputedStatus(equipment)

    return {
      status: 200,
      body: equipmentWithStatus
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch equipment'
    })
  }
})
