import prisma from '../../prisma'
import { responses } from '../../utils/openapi'
import { computeReservationStatus } from '../../utils/reservationStatus'
import { isInstructorOrAdmin } from '../../middleware/session'

defineRouteMeta({
  openAPI: {
    tags: ['Reports'],
    summary: 'Get equipment utilization report (Admin/Instructor)',
    description:
      'Get comprehensive utilization report for equipment. Can filter by specific equipment IDs or by lab. Returns GANTT chart data and detailed statistics.',
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
      },
      {
        name: 'equipment_ids',
        in: 'query',
        description: 'Comma-separated list of equipment IDs to filter by',
        required: false,
        schema: {
          type: 'string'
        }
      },
      {
        name: 'lab_id',
        in: 'query',
        description: 'Lab ID to filter equipment by',
        required: false,
        schema: {
          type: 'integer'
        }
      }
    ],
    responses: {
      200: {
        description: 'Equipment utilization report',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    equipment: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          name: { type: 'string' },
                          serialNumber: { type: 'string' },
                          lab: {
                            type: 'object',
                            properties: {
                              id: { type: 'number' },
                              building: { type: 'string' },
                              roomNumber: { type: 'string' }
                            }
                          },
                          utilization: {
                            type: 'object',
                            properties: {
                              totalMinutes: { type: 'number' },
                              reservedMinutes: { type: 'number' },
                              utilizationPercentage: { type: 'number' },
                              reservationCount: { type: 'number' }
                            }
                          },
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
                                    email: { type: 'string' },
                                    name: { type: 'string' }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    overallStatistics: {
                      type: 'object',
                      properties: {
                        totalEquipment: { type: 'number' },
                        averageUtilizationPercentage: { type: 'number' },
                        totalReservations: { type: 'number' },
                        totalReservedMinutes: { type: 'number' }
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
      403: responses[403],
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

  if (!isInstructorOrAdmin(user)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
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
    // Build equipment filter
    const equipmentWhere: Record<string, any> = {}

    if (query.equipment_ids) {
      const equipmentIds = (query.equipment_ids as string)
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id))

      if (equipmentIds.length > 0) {
        equipmentWhere.id = { in: equipmentIds }
      }
    }

    if (query.lab_id) {
      const labId = parseInt(query.lab_id as string, 10)
      if (isNaN(labId)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid lab ID'
        })
      }
      equipmentWhere.labId = labId
    }

    // Fetch equipment
    const equipment = await prisma.equipment.findMany({
      where: equipmentWhere,
      include: {
        lab: {
          select: {
            id: true,
            building: true,
            roomNumber: true
          }
        },
        reservationLinks: {
          where: {
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
                    email: true,
                    name: true
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
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    let totalReservations = 0
    let totalReservedMinutes = 0
    const uniqueUsers = new Set<number>()

    // Process each equipment
    const equipmentData = equipment.map((eq) => {
      const timeline = eq.reservationLinks.map((link) => {
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
          label: `${reservation.purpose || 'Reservation'} - ${reservation.user.name || reservation.user.email}`,
          user: {
            id: reservation.userId,
            email: reservation.user.email,
            name: reservation.user.name || 'N/A'
          }
        }
      })

      // Calculate utilization for this equipment
      let reservedMinutes = 0
      let reservationCount = 0
      const equipmentUsers = new Set<number>()
      let averageDuration = 0

      for (const item of timeline) {
        if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status)) {
          const durationMs = item.endTime.getTime() - item.startTime.getTime()
          const durationMinutes = Math.floor(durationMs / (1000 * 60))
          reservedMinutes += durationMinutes
          reservationCount++
          equipmentUsers.add(item.user.id)
          uniqueUsers.add(item.user.id)
        }
      }

      averageDuration = reservationCount > 0 ? reservedMinutes / reservationCount : 0
      const utilizationPercentage = totalMinutes > 0 ? (reservedMinutes / totalMinutes) * 100 : 0

      totalReservations += reservationCount
      totalReservedMinutes += reservedMinutes

      return {
        equipment_id: eq.id,
        equipment_name: eq.name,
        serial_number: eq.serialNumber,
        lab_name: `${eq.lab.building} ${eq.lab.roomNumber}`,
        lab_id: eq.lab.id,
        utilization_percent: Math.round(utilizationPercentage * 100) / 100,
        total_reservations: reservationCount,
        total_duration_minutes: Math.round(reservedMinutes),
        average_duration_minutes: Math.round(averageDuration),
        unique_users: equipmentUsers.size,
        timeline
      }
    })

    // Calculate overall statistics
    const averageUtilizationPercentage =
      equipmentData.length > 0
        ? equipmentData.reduce((sum, eq) => sum + eq.utilization_percent, 0) / equipmentData.length
        : 0

    return {
      status: 200,
      body: {
        start_date: startDate,
        end_date: endDate,
        equipment_usage: equipmentData,
        total_reservations: totalReservations,
        total_duration_minutes: Math.round(totalReservedMinutes),
        average_utilization_percent: Math.round(averageUtilizationPercentage * 100) / 100,
        unique_users: uniqueUsers.size,
        total_equipment: equipmentData.length
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate equipment utilization report'
    })
  }
})
