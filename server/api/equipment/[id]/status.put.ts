import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { parameters, responses } from '../../../utils/openapi'
import { isStorableStatus } from '../../../utils/equipmentStatus'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Update equipment status',
    description:
      'Update equipment operational status. Only OPERATIONAL, MAINTENANCE, and OUT_OF_ORDER statuses can be set. AVAILABLE and IN_USE are computed based on reservations. Requires ADMIN or INSTRUCTOR role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['status'],
            properties: {
              status: {
                type: 'string',
                enum: ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER']
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Status updated successfully',
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

  const equipmentId = event.context.params?.id
  if (!equipmentId) throw createError({ statusCode: 400, statusMessage: 'Missing equipment id' })

  const body = await readBody(event)
  const { status } = body

  if (!status || !isStorableStatus(status)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid status. Only OPERATIONAL, MAINTENANCE, and OUT_OF_ORDER can be set. AVAILABLE and IN_USE are computed based on reservations.'
    })
  }

  // Get equipment
  const equipment = await prisma.equipment.findUnique({ where: { id: Number(equipmentId) } })
  if (!equipment) {
    throw createError({ statusCode: 404, statusMessage: 'Equipment not found' })
  }

  // Only admins and instructors can update equipment status
  if (!isAdmin(user) && user.role !== 'INSTRUCTOR') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only administrators and instructors can update equipment status'
    })
  }

  await prisma.equipment.update({ where: { id: Number(equipmentId) }, data: { status } })
  return { success: true }
})
