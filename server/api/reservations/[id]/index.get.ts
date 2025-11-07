import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { parameters, responses } from '../../../utils/openapi'
import { addComputedStatus } from '../../../utils/equipmentStatus'
import { addComputedReservationStatus } from '../../../utils/reservationStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Reservations'],
    summary: 'Get reservation by ID',
    description:
      'Retrieve detailed information about a specific reservation. Equipment status and reservation status are computed based on current time and reservations.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Reservation details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reservation: { $ref: '#/components/schemas/ReservationWithDetails' }
              }
            }
          }
        }
      },
      400: responses[400],
      401: responses[401],
      403: responses[403],
      404: responses[404]
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing reservation id' })
  const reservation = await prisma.reservation.findUnique({
    where: { id: Number(id) },
    include: {
      equipment: {
        include: {
          equipment: {
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
                select: {
                  reservation: {
                    select: {
                      status: true,
                      startTime: true,
                      endTime: true
                    }
                  }
                }
              }
            }
          }
        }
      },
      user: true
    }
  })
  if (!reservation) throw createError({ statusCode: 404, statusMessage: 'Reservation not found' })
  if (!isAdmin(user) && reservation.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Add computed status to equipment and reservation
  const reservationWithComputedStatus = addComputedReservationStatus({
    ...reservation,
    equipment: reservation.equipment.map((eq) => ({
      ...eq,
      equipment: addComputedStatus(eq.equipment)
    }))
  })

  return { reservation: reservationWithComputedStatus }
})
