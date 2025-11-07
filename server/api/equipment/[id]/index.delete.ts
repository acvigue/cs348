import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Delete equipment',
    description: 'Delete an equipment item. Requires ADMIN or INSTRUCTOR role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Equipment deleted successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { $ref: '#/components/schemas/SuccessMessage' }
              }
            }
          }
        }
      },
      400: responses[400],
      401: responses[401],
      403: responses[403],
      404: responses[404],
      500: responses[500]
    }
  }
})

async function checkUserPermissions(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || !['ADMIN', 'INSTRUCTOR'].includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Insufficient permissions. Only administrators and instructors can delete equipment.'
    })
  }

  return user
}

export default defineEventHandler(async (event) => {
  const equipmentId = getRouterParam(event, 'id')

  if (!equipmentId || isNaN(Number(equipmentId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid equipment ID'
    })
  }

  // Check authentication
  if (!event.context.session.data.user_id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Check permissions
  await checkUserPermissions(event.context.session.data.user_id)

  try {
    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: Number(equipmentId) },
      include: {
        reservationLinks: {
          where: {
            reservation: {
              status: {
                in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
              }
            }
          }
        }
      }
    })

    if (!existingEquipment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Equipment not found'
      })
    }

    // Check if equipment has active reservations
    if (existingEquipment.reservationLinks.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete equipment with active reservations'
      })
    }

    await prisma.equipment.delete({
      where: { id: Number(equipmentId) }
    })

    return {
      status: 200,
      body: { message: 'Equipment deleted successfully' }
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete equipment'
    })
  }
})
