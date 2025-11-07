import prisma from '../../prisma'
import { responses } from '../../utils/openapi'
import { computeReservationStatus } from '../../utils/reservationStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Reports'],
    summary: 'Get student utilization report',
    description:
      'Get utilization report for the authenticated user showing all their reservations and statistics over a specified time period.',
    security: [{ sessionAuth: [] }],
    parameters: [
      {
        name: 'start_date',
        in: 'query',
        description: 'Start date for the report (ISO 8601 format)',
        required: false,
        schema: {
          type: 'string',
          format: 'date-time'
        }
      },
      {
        name: 'end_date',
        in: 'query',
        description: 'End date for the report (ISO 8601 format)',
        required: false,
        schema: {
          type: 'string',
          format: 'date-time'
        }
      },
      {
        name: 'days',
        in: 'query',
        description: 'Number of days to look back from today (default: 30)',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 365
        }
      }
    ],
    responses: {
      200: {
        description: 'Student utilization report',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    userId: { type: 'number' },
                    userName: { type: 'string' },
                    userEmail: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    reservations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          startTime: { type: 'string', format: 'date-time' },
                          endTime: { type: 'string', format: 'date-time' },
                          status: { type: 'string' },
                          purpose: { type: 'string' },
                          durationMinutes: { type: 'number' },
                          equipment: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'number' },
                                name: { type: 'string' },
                                lab: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'number' },
                                    building: { type: 'string' },
                                    roomNumber: { type: 'string' }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    statistics: {
                      type: 'object',
                      properties: {
                        totalReservations: { type: 'number' },
                        confirmedReservations: { type: 'number' },
                        cancelledReservations: { type: 'number' },
                        completedReservations: { type: 'number' },
                        totalTimeReservedMinutes: { type: 'number' },
                        totalTimeUsedMinutes: { type: 'number' },
                        averageReservationDurationMinutes: { type: 'number' },
                        equipmentUsageCount: {
                          type: 'object',
                          additionalProperties: { type: 'number' }
                        },
                        labUsageCount: {
                          type: 'object',
                          additionalProperties: { type: 'number' }
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
      401: responses[401],
      400: responses[400],
      500: responses[500]
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)

  // Parse date range
  let startDate: Date
  let endDate: Date

  if (query.start_date && query.end_date) {
    startDate = new Date(query.start_date as string)
    endDate = new Date(query.end_date as string)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid date format'
      })
    }

    if (startDate >= endDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Start date must be before end date'
      })
    }
  } else {
    // Use days parameter (default 30)
    let days = 30
    if (query.days) {
      const parsedDays = parseInt(query.days as string, 10)
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Days parameter must be between 1 and 365'
        })
      }
      days = parsedDays
    }

    endDate = new Date()
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
  }

  try {
    // Fetch user details
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (!userDetails) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Fetch reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: user.id,
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
      },
      include: {
        equipment: {
          include: {
            equipment: {
              include: {
                lab: {
                  select: {
                    id: true,
                    building: true,
                    roomNumber: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // Process reservations and calculate statistics
    const reservationsWithDetails = reservations.map((reservation) => {
      const computedStatus = computeReservationStatus({
        status: reservation.status,
        startTime: reservation.startTime,
        endTime: reservation.endTime
      })

      // Clamp times to the requested range
      const clampedStartTime = reservation.startTime < startDate ? startDate : reservation.startTime
      const clampedEndTime = reservation.endTime > endDate ? endDate : reservation.endTime

      const durationMs = clampedEndTime.getTime() - clampedStartTime.getTime()
      const durationMinutes = Math.floor(durationMs / (1000 * 60))

      const equipmentNames = reservation.equipment.map((eq) => eq.equipment.name).join(', ')

      return {
        id: reservation.id,
        startTime: clampedStartTime,
        endTime: clampedEndTime,
        status: computedStatus,
        purpose: reservation.purpose,
        label: `${reservation.purpose || 'Reservation'} - ${equipmentNames}`,
        durationMinutes,
        equipment: reservation.equipment.map((eq) => ({
          id: eq.equipment.id,
          name: eq.equipment.name,
          lab: eq.equipment.lab
        }))
      }
    })

    // Calculate statistics
    const totalReservations = reservationsWithDetails.length

    const totalTimeReservedMinutes = reservationsWithDetails.reduce(
      (sum, r) => sum + r.durationMinutes,
      0
    )

    const averageReservationDurationMinutes =
      totalReservations > 0 ? totalTimeReservedMinutes / totalReservations : 0

    // Equipment usage count
    const equipmentUsageCount: Record<string, number> = {}
    for (const reservation of reservationsWithDetails) {
      if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(reservation.status)) {
        for (const eq of reservation.equipment) {
          const key = eq.name
          equipmentUsageCount[key] = (equipmentUsageCount[key] || 0) + 1
        }
      }
    }

    // Lab usage count
    const labUsageCount: Record<string, number> = {}
    for (const reservation of reservationsWithDetails) {
      if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(reservation.status)) {
        for (const eq of reservation.equipment) {
          const key = `${eq.lab.building} ${eq.lab.roomNumber}`
          labUsageCount[key] = (labUsageCount[key] || 0) + 1
        }
      }
    }

    // Create timeline for GANTT chart
    const timeline = reservationsWithDetails.map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status,
      label: r.label
    }))

    // Calculate by_status
    const byStatus = {
      PENDING: reservationsWithDetails.filter((r) => r.status === 'PENDING').length,
      CONFIRMED: reservationsWithDetails.filter((r) => r.status === 'CONFIRMED').length,
      IN_PROGRESS: reservationsWithDetails.filter((r) => r.status === 'IN_PROGRESS').length,
      COMPLETED: reservationsWithDetails.filter((r) => r.status === 'COMPLETED').length,
      CANCELLED: reservationsWithDetails.filter((r) => r.status === 'CANCELLED').length
    }

    return {
      status: 200,
      body: {
        user_id: userDetails.id,
        user_name: userDetails.name || 'N/A',
        user_email: userDetails.email,
        start_date: startDate,
        end_date: endDate,
        total_reservations: totalReservations,
        total_duration_minutes: totalTimeReservedMinutes,
        average_duration_minutes: Math.round(averageReservationDurationMinutes),
        by_status: byStatus,
        reservations: reservationsWithDetails,
        timeline,
        equipment_usage: equipmentUsageCount,
        lab_usage: labUsageCount
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate utilization report'
    })
  }
})
