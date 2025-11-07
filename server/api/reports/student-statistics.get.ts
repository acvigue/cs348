import prisma from '../../prisma'
import { responses } from '../../utils/openapi'
import { computeReservationStatus } from '../../utils/reservationStatus'
import { isInstructorOrAdmin } from '../../middleware/session'

defineRouteMeta({
  openAPI: {
    tags: ['Reports'],
    summary: 'Get student utilization statistics (Admin/Instructor)',
    description:
      'Get comprehensive utilization statistics for all students or specific students. Shows reservation patterns, equipment usage, and time utilization.',
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
        description: 'Student utilization statistics',
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
                    students: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          userId: { type: 'number' },
                          userName: { type: 'string' },
                          userEmail: { type: 'string' },
                          statistics: {
                            type: 'object',
                            properties: {
                              totalReservations: { type: 'number' },
                              confirmedReservations: { type: 'number' },
                              cancelledReservations: { type: 'number' },
                              completedReservations: { type: 'number' },
                              totalTimeReservedMinutes: { type: 'number' },
                              utilizationPercentage: { type: 'number' }
                            }
                          }
                        }
                      }
                    },
                    overallStatistics: {
                      type: 'object',
                      properties: {
                        totalStudents: { type: 'number' },
                        totalReservations: { type: 'number' },
                        totalTimeReservedMinutes: { type: 'number' },
                        averageReservationsPerStudent: { type: 'number' },
                        averageTimePerStudent: { type: 'number' }
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
    // Fetch all students with their reservations in the date range
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT'
      },
      include: {
        reservations: {
          where: {
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
        }
      },
      orderBy: {
        email: 'asc'
      }
    })

    let totalReservationsCount = 0
    let totalTimeReservedMinutes = 0

    const studentStats = students.map((student) => {
      const reservations = student.reservations.map((reservation) => {
        const computedStatus = computeReservationStatus({
          status: reservation.status,
          startTime: reservation.startTime,
          endTime: reservation.endTime
        })

        // Clamp times to the requested range
        const clampedStartTime =
          reservation.startTime < startDate ? startDate : reservation.startTime
        const clampedEndTime = reservation.endTime > endDate ? endDate : reservation.endTime

        const durationMs = clampedEndTime.getTime() - clampedStartTime.getTime()
        const durationMinutes = Math.floor(durationMs / (1000 * 60))

        return {
          status: computedStatus,
          durationMinutes
        }
      })

      const totalReservations = reservations.length
      const confirmedReservations = reservations.filter((r) =>
        ['CONFIRMED', 'IN_PROGRESS'].includes(r.status)
      ).length
      const cancelledReservations = reservations.filter((r) => r.status === 'CANCELLED').length
      const completedReservations = reservations.filter((r) => r.status === 'COMPLETED').length

      const timeReservedMinutes = reservations
        .filter((r) => ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(r.status))
        .reduce((sum, r) => sum + r.durationMinutes, 0)

      const averageDuration = totalReservations > 0 ? timeReservedMinutes / totalReservations : 0

      totalReservationsCount += totalReservations
      totalTimeReservedMinutes += timeReservedMinutes

      return {
        user_id: student.id,
        user_name: student.name || 'N/A',
        user_email: student.email,
        total_reservations: totalReservations,
        confirmed_reservations: confirmedReservations,
        cancelled_reservations: cancelledReservations,
        completed_reservations: completedReservations,
        total_duration_minutes: Math.round(timeReservedMinutes),
        average_duration_minutes: Math.round(averageDuration),
        percentage_of_total: 0 // Will be calculated later
      }
    })

    // Filter out students with no reservations
    const activeStudents = studentStats.filter((s) => s.total_reservations > 0)

    // Calculate percentage of total for each student
    activeStudents.forEach((student) => {
      student.percentage_of_total =
        totalTimeReservedMinutes > 0
          ? Math.round((student.total_duration_minutes / totalTimeReservedMinutes) * 10000) / 100
          : 0
    })

    const averageReservationsPerStudent =
      activeStudents.length > 0 ? totalReservationsCount / activeStudents.length : 0
    const averageTimePerStudent =
      activeStudents.length > 0 ? totalTimeReservedMinutes / activeStudents.length : 0

    return {
      status: 200,
      body: {
        start_date: startDate,
        end_date: endDate,
        students: activeStudents,
        total_students: activeStudents.length,
        total_reservations: totalReservationsCount,
        total_duration_minutes: Math.round(totalTimeReservedMinutes),
        average_reservations_per_student: Math.round(averageReservationsPerStudent * 100) / 100,
        average_time_per_student: Math.round(averageTimePerStudent)
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate student statistics report'
    })
  }
})
