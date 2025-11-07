import prisma from '../../../prisma'
import { z } from 'zod'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Update equipment',
    description: 'Update equipment information. Requires ADMIN or INSTRUCTOR role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Equipment name' },
              type: { type: 'string', description: 'Equipment type' },
              serialNumber: { type: 'string', description: 'Serial number' },
              description: { type: 'string', description: 'Description' },
              labId: { type: 'number', description: 'Lab ID' },
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
        description: 'Equipment updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { $ref: '#/components/schemas/EquipmentWithLab' }
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

const updateEquipmentSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.string().min(1, 'Type is required').optional(),
  serialNumber: z.string().min(1, 'Serial number is required').optional(),
  description: z.string().optional(),
  labId: z.number().int().positive('Lab ID must be a positive integer').optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER']).optional()
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
        'Insufficient permissions. Only administrators and instructors can update equipment.'
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
    const body = await readBody(event)
    const validatedData = updateEquipmentSchema.parse(body)

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: Number(equipmentId) }
    })

    if (!existingEquipment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Equipment not found'
      })
    }

    // Check if lab exists (if labId is being updated)
    if (validatedData.labId) {
      const lab = await prisma.lab.findUnique({
        where: { id: validatedData.labId }
      })

      if (!lab) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Lab not found'
        })
      }
    }

    // Check if serial number is unique (if serialNumber is being updated)
    if (
      validatedData.serialNumber &&
      validatedData.serialNumber !== existingEquipment.serialNumber
    ) {
      const duplicateEquipment = await prisma.equipment.findUnique({
        where: { serialNumber: validatedData.serialNumber }
      })

      if (duplicateEquipment) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Equipment with this serial number already exists'
        })
      }
    }

    const equipment = await prisma.equipment.update({
      where: { id: Number(equipmentId) },
      data: validatedData,
      include: {
        lab: true
      }
    })

    return {
      status: 200,
      body: equipment
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        data: error.issues
      })
    }

    // Re-throw createError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update equipment'
    })
  }
})
