import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'
import { computeReservationStatus } from '../../../utils/reservationStatus'
import type { ComputedReservationStatus } from '../../../utils/reservationStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Get equipment utilization',
    description:
      'Get equipment utilization data over a specified time period. Returns reservation timeline and utilization statistics.',
    parameters: [
      parameters.id,
      {
        name: 'days',
        in: 'query',
        description: 'Number of days to look back (default: 7)',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 90,
          default: 7
        }
      }
    ],
    responses: {
      200: {
        description: 'Equipment utilization data',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    equipmentId: { type: 'number' },
                    equipmentName: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    days: { type: 'number' },
                    timeline: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          reservationId: { type: 'number' },
                          startTime: { type: 'string', format: 'date-time' },
                          endTime: { type: 'string', format: 'date-time' },
                          status: { type: 'string' },
                          purpose: { type: 'string' },
                          user: {
                            type: 'object',
                            properties: {
                              email: { type: 'string' }
                            }
                          }
                        }
                      }
                    },
                    utilization: {
                      type: 'object',
                      properties: {
                        totalMinutes: { type: 'number' },
                        reservedMinutes: { type: 'number' },
                        utilizationPercentage: { type: 'number' }
                      }
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

interface TimelineItem {
  reservationId: number
  startTime: Date
  endTime: Date
  status: ComputedReservationStatus
  purpose: string
  user: {
    email: string
  }
}

export default defineEventHandler(async (event) => {
  const equipmentId = getRouterParam(event, 'id')
  const query = getQuery(event)

  if (!equipmentId || isNaN(Number(equipmentId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid equipment ID'
    })
  }

  // Parse days parameter (default 7, max 90)
  let days = 7
  if (query.days) {
    const parsedDays = parseInt(query.days as string, 10)
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 90) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Days parameter must be between 1 and 90'
      })
    }
    days = parsedDays
  }

  try {
    // Verify equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: {
        id: Number(equipmentId)
      },
      select: {
        id: true,
        name: true
      }
    })

    if (!equipment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Equipment not found'
      })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Fetch all reservations for this equipment in the time range
    const reservationLinks = await prisma.reservationEquipment.findMany({
      where: {
        equipmentId: Number(equipmentId),
        reservation: {
          OR: [
            // Reservations that start within the range
            {
              startTime: {
                gte: startDate,
                lte: endDate
              }
            },
            // Reservations that end within the range
            {
              endTime: {
                gte: startDate,
                lte: endDate
              }
            },
            // Reservations that span the entire range
            {
              AND: [
                {
                  startTime: {
                    lte: startDate
                  }
                },
                {
                  endTime: {
                    gte: endDate
                  }
                }
              ]
            }
          ]
        }
      },
      include: {
        reservation: {
          include: {
            user: {
              select: {
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        reservation: {
          startTime: 'asc'
        }
      }
    })

    // Build timeline with computed statuses
    const timeline: TimelineItem[] = reservationLinks.map((link) => {
      const reservation = link.reservation
      const computedStatus = computeReservationStatus({
        status: reservation.status,
        startTime: reservation.startTime,
        endTime: reservation.endTime
      })

      // Clamp times to the requested range
      const clampedStartTime = reservation.startTime < startDate ? startDate : reservation.startTime
      const clampedEndTime = reservation.endTime > endDate ? endDate : reservation.endTime

      return {
        reservationId: reservation.id,
        startTime: clampedStartTime,
        endTime: clampedEndTime,
        status: computedStatus,
        purpose: reservation.purpose,
        user: {
          email: reservation.user.email
        }
      }
    })

    // Calculate utilization statistics
    // Only count CONFIRMED, IN_PROGRESS, and COMPLETED reservations
    const totalMinutes = days * 24 * 60
    let reservedMinutes = 0

    for (const item of timeline) {
      if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status)) {
        const durationMs = item.endTime.getTime() - item.startTime.getTime()
        const durationMinutes = Math.floor(durationMs / (1000 * 60))
        reservedMinutes += durationMinutes
      }
    }

    const utilizationPercentage = totalMinutes > 0 ? (reservedMinutes / totalMinutes) * 100 : 0

    return {
      status: 200,
      body: {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        startDate,
        endDate,
        days,
        timeline,
        utilization: {
          totalMinutes,
          reservedMinutes,
          utilizationPercentage: Math.round(utilizationPercentage * 100) / 100 // Round to 2 decimals
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
      statusMessage: 'Failed to fetch equipment utilization'
    })
  }
})
