import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'Get lab statistics',
    description: 'Retrieve statistics for a specific lab including equipment status and usage',
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Lab statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { $ref: '#/components/schemas/LabStatistics' }
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
      where: { id: Number(labId) }
    })

    if (!lab) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lab not found'
      })
    }

    // Get equipment statistics
    const equipmentStats = await prisma.equipment.groupBy({
      by: ['status'],
      where: {
        labId: Number(labId)
      },
      _count: {
        id: true
      }
    })

    // Get reservation statistics for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentReservations = await prisma.reservation.count({
      where: {
        equipment: {
          some: {
            equipment: {
              labId: Number(labId)
            }
          }
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    // Get active reservations
    const activeReservations = await prisma.reservation.count({
      where: {
        equipment: {
          some: {
            equipment: {
              labId: Number(labId)
            }
          }
        },
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS']
        },
        endTime: {
          gte: new Date()
        }
      }
    })

    // Calculate utilization rate (simplified - active reservations vs total equipment)
    const totalEquipment = await prisma.equipment.count({
      where: {
        labId: Number(labId),
        status: {
          in: ['AVAILABLE', 'IN_USE']
        }
      }
    })

    const utilizationRate = totalEquipment > 0 ? (activeReservations / totalEquipment) * 100 : 0

    return {
      status: 200,
      body: {
        lab,
        statistics: {
          equipmentByStatus: equipmentStats.reduce(
            (acc, stat) => {
              acc[stat.status] = stat._count.id
              return acc
            },
            {} as Record<string, number>
          ),
          totalEquipment,
          recentReservations,
          activeReservations,
          utilizationRate: Math.round(utilizationRate * 100) / 100
        }
      }
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lab statistics'
    })
  }
})
