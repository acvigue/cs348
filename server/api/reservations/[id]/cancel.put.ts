import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { ReservationStatus } from '~/generated/prisma/enums'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Reservations'],
    summary: 'Cancel reservation',
    description:
      'Cancel a reservation. Admins, instructors (except their own), and reservation owners can cancel.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Reservation cancelled successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' }
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
  const reservation = await prisma.reservation.findUnique({ where: { id: Number(id) } })
  if (!reservation) throw createError({ statusCode: 404, statusMessage: 'Reservation not found' })
  if (new Date() > reservation.endTime)
    throw createError({ statusCode: 400, statusMessage: 'Reservation is immutable' })
  if (
    isAdmin(user) ||
    (user.role === 'INSTRUCTOR' && reservation.userId !== user.id) ||
    reservation.userId === user.id
  ) {
    await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status: ReservationStatus.CANCELLED }
    })
    return { success: true }
  }
  throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
})
