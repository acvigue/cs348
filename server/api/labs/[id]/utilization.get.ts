import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'
import { computeReservationStatus } from '../../../utils/reservationStatus'
import type { ComputedReservationStatus } from '../../../utils/reservationStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'Get lab equipment utilization',
    description:
      'Get utilization data for all equipment in a lab over a specified time period. Returns timeline data for each equipment item.',
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
        description: 'Lab equipment utilization data',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    labId: { type: 'number' },
                    labName: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    days: { type: 'number' },
                    equipment: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          equipmentId: { type: 'number' },
                          equipmentName: { type: 'string' },
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
                          }
                        }
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
  const labId = getRouterParam(event, 'id')
  const query = getQuery(event)

  if (!labId || isNaN(Number(labId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid lab ID'
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
    // Verify lab exists and get equipment
    const lab = await prisma.lab.findUnique({
      where: {
        id: Number(labId)
      },
      select: {
        id: true,
        building: true,
        roomNumber: true,
        equipment: {
          select: {
            id: true,
            name: true
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

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Fetch reservations for all equipment in the lab
    const equipmentUtilization = await Promise.all(
      lab.equipment.map(async (equipment) => {
        const reservationLinks = await prisma.reservationEquipment.findMany({
          where: {
            equipmentId: equipment.id,
            reservation: {
              OR: [
                {
                  startTime: {
                    gte: startDate,
                    lte: endDate
                  }
                },
                {
                  endTime: {
                    gte: startDate,
                    lte: endDate
                  }
                },
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
          const clampedStartTime =
            reservation.startTime < startDate ? startDate : reservation.startTime
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

        return {
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          timeline
        }
      })
    )

    return {
      status: 200,
      body: {
        labId: lab.id,
        labName: `${lab.building} ${lab.roomNumber}`,
        startDate,
        endDate,
        days,
        equipment: equipmentUtilization
      }
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch lab equipment utilization'
    })
  }
})
