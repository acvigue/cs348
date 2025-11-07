import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'
import { addComputedStatusToMany } from '../../../utils/equipmentStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Get equipment by lab',
    description:
      'Retrieve all equipment in a specific lab. Status is computed based on current reservations.',
    parameters: [parameters.labId],
    responses: {
      200: {
        description: 'Lab and equipment list',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    lab: { $ref: '#/components/schemas/Lab' },
                    equipment: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/EquipmentWithLab' }
                    }
                  }
                }
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
  const labId = getRouterParam(event, 'labId')

  if (!labId || isNaN(Number(labId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid lab ID'
    })
  }

  try {
    // Check if lab exists
    const lab = await prisma.lab.findUnique({
      where: { id: Number(labId) }
    })

    if (!lab) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lab not found'
      })
    }

    const equipment = await prisma.equipment.findMany({
      where: {
        labId: Number(labId)
      },
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
      status: 200,
      body: {
        lab,
        equipment: equipmentWithStatus
      }
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lab equipment'
    })
  }
})
