import prisma from '../../../prisma'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'Delete lab',
    description: 'Delete a lab. Requires ADMIN role. Lab must not contain equipment.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    responses: {
      200: {
        description: 'Lab deleted successfully',
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

async function checkAdminPermissions(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions. Only administrators can delete labs.'
    })
  }

  return user
}

export default defineEventHandler(async (event) => {
  const labId = getRouterParam(event, 'id')

  if (!labId || isNaN(Number(labId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid lab ID'
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
  await checkAdminPermissions(event.context.session.data.user_id)

  try {
    // Check if lab exists and has equipment
    const existingLab = await prisma.lab.findUnique({
      where: { id: Number(labId) },
      include: {
        equipment: {
          include: {
            reservationLinks: {
              where: {
                reservation: {
                  status: {
                    in: ['PENDING', 'CONFIRMED']
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!existingLab) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lab not found'
      })
    }

    // Check if lab has equipment with active reservations
    const hasActiveReservations = existingLab.equipment.some(
      (equipment) => equipment.reservationLinks.length > 0
    )

    if (hasActiveReservations) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete lab with equipment that has active reservations'
      })
    }

    // Check if lab has any equipment at all
    if (existingLab.equipment.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Cannot delete lab that contains equipment. Remove or relocate equipment first.'
      })
    }

    await prisma.lab.delete({
      where: { id: Number(labId) }
    })

    return {
      status: 200,
      body: { message: 'Lab deleted successfully' }
    }
  } catch (error) {
    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete lab'
    })
  }
})
