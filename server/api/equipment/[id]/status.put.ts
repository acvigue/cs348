import prisma from '../../../prisma'
import { isAdmin } from '../../../middleware/session'
import { EquipmentStatus } from '~/generated/prisma/enums'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Update equipment status',
    description:
      'Update equipment status. Admins can set any status. Users can only set IN_USE/AVAILABLE if they have an active reservation.',
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
                enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER']
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
  if (!status || !Object.values(EquipmentStatus).includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  // Get equipment and labId
  const equipment = await prisma.equipment.findUnique({ where: { id: Number(equipmentId) } })
  if (!equipment) {
    throw createError({ statusCode: 404, statusMessage: 'Equipment not found' })
  }

  // Admins can set any status
  if (isAdmin(user)) {
    await prisma.equipment.update({ where: { id: Number(equipmentId) }, data: { status } })
    return { success: true }
  }

  // Users can only set IN_USE or AVAILABLE if they have a confirmed reservation for this equipment in this lab and current time is within reservation
  if (![EquipmentStatus.IN_USE, EquipmentStatus.AVAILABLE].includes(status)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const now = new Date()
  const reservationLink = await prisma.reservationEquipment.findFirst({
    where: {
      equipmentId: Number(equipmentId),
      reservation: {
        userId: user.id,
        startTime: { lte: now },
        endTime: { gte: now },
        status: 'CONFIRMED'
      }
    }
  })
  if (!reservationLink) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No valid reservation for this equipment at this time'
    })
  }

  await prisma.equipment.update({ where: { id: Number(equipmentId) }, data: { status } })
  return { success: true }
})
