import prisma from '../../prisma'
import { responses } from '../../utils/openapi'
import { computeReservationStatus } from '../../utils/reservationStatus'
import { isInstructorOrAdmin } from '../../middleware/session'

defineRouteMeta({
  openAPI: {
    tags: ['Reports'],
    summary: 'Get lab utilization statistics (Admin/Instructor)',
    description:
      'Get comprehensive utilization statistics for labs. Shows equipment usage within each lab, reservation patterns, and time utilization.',
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
        description: 'Lab utilization statistics',
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
                    labs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          building: { type: 'string' },
                          roomNumber: { type: 'string' },
                          totalEquipment: { type: 'number' },
                          statistics: {
                            type: 'object',
                            properties: {
                              totalReservations: { type: 'number' },
                              averageUtilizationPercentage: { type: 'number' },
                              totalReservedMinutes: { type: 'number' },
                              uniqueStudents: { type: 'number' }
                            }
                          },
                          equipmentBreakdown: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                equipmentId: { type: 'number' },
                                equipmentName: { type: 'string' },
                                reservationCount: { type: 'number' },
                                utilizationPercentage: { type: 'number' }
                              }
                            }
                          }
                        }
                      }
                    },
                    overallStatistics: {
                      type: 'object',
                      properties: {
                        totalLabs: { type: 'number' },
                        totalEquipment: { type: 'number' },
                        totalReservations: { type: 'number' },
                        averageLabUtilization: { type: 'number' }
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
    // Fetch all labs with equipment and reservations
    const labs = await prisma.lab.findMany({
      include: {
        equipment: {
          include: {
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
                        id: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        building: 'asc'
      }
    })

    const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    let totalReservationsOverall = 0
    let totalEquipmentCount = 0

    const labStats = labs.map((lab) => {
      const uniqueStudentIds = new Set<number>()
      let totalLabReservations = 0
      let totalLabReservedMinutes = 0

      const equipmentBreakdown = lab.equipment.map((equipment) => {
        let reservedMinutes = 0
        let reservationCount = 0

        for (const link of equipment.reservationLinks) {
          const reservation = link.reservation
          const computedStatus = computeReservationStatus({
            status: reservation.status,
            startTime: reservation.startTime,
            endTime: reservation.endTime
          })

          if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(computedStatus)) {
            // Clamp times to the requested range
            const clampedStartTime =
              reservation.startTime < startDate ? startDate : reservation.startTime
            const clampedEndTime = reservation.endTime > endDate ? endDate : reservation.endTime

            const durationMs = clampedEndTime.getTime() - clampedStartTime.getTime()
            const durationMinutes = Math.floor(durationMs / (1000 * 60))

            reservedMinutes += durationMinutes
            reservationCount++

            // Track unique students
            uniqueStudentIds.add(reservation.user.id)
          }
        }

        totalLabReservations += reservationCount
        totalLabReservedMinutes += reservedMinutes

        const utilizationPercentage = totalMinutes > 0 ? (reservedMinutes / totalMinutes) * 100 : 0

        return {
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          reservation_count: reservationCount,
          utilization_percent: Math.round(utilizationPercentage * 100) / 100
        }
      })

      const averageUtilizationPercentage =
        lab.equipment.length > 0
          ? equipmentBreakdown.reduce((sum, eq) => sum + eq.utilization_percent, 0) /
            lab.equipment.length
          : 0

      const averageReservationDuration =
        totalLabReservations > 0 ? totalLabReservedMinutes / totalLabReservations : 0

      totalReservationsOverall += totalLabReservations
      totalEquipmentCount += lab.equipment.length

      return {
        lab_id: lab.id,
        lab_name: `${lab.building} ${lab.roomNumber}`,
        total_equipment: lab.equipment.length,
        total_reservations: totalLabReservations,
        utilization_percent: Math.round(averageUtilizationPercentage * 100) / 100,
        total_duration_minutes: Math.round(totalLabReservedMinutes),
        average_reservation_duration: Math.round(averageReservationDuration),
        unique_users: uniqueStudentIds.size,
        percentage_of_total: 0, // Will be calculated later
        equipment_breakdown: equipmentBreakdown
      }
    })

    // Calculate overall average and percentages
    const averageLabUtilization =
      labStats.length > 0
        ? labStats.reduce((sum, lab) => sum + lab.utilization_percent, 0) / labStats.length
        : 0

    const totalDurationMinutes = labStats.reduce((sum, lab) => sum + lab.total_duration_minutes, 0)

    // Update percentage of total for each lab
    labStats.forEach((lab) => {
      lab.percentage_of_total =
        totalDurationMinutes > 0
          ? Math.round((lab.total_duration_minutes / totalDurationMinutes) * 10000) / 100
          : 0
    })

    return {
      status: 200,
      body: {
        start_date: startDate,
        end_date: endDate,
        labs: labStats,
        total_labs: labStats.length,
        total_equipment: totalEquipmentCount,
        total_reservations: totalReservationsOverall,
        total_duration_minutes: totalDurationMinutes,
        average_lab_utilization: Math.round(averageLabUtilization * 100) / 100
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate lab statistics report'
    })
  }
})
