import prisma from '../../prisma'
import { z } from 'zod'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'Create new equipment',
    description: 'Create a new equipment item. Requires ADMIN or INSTRUCTOR role.',
    security: [{ sessionAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'type', 'serialNumber', 'labId'],
            properties: {
              name: { type: 'string', description: 'Equipment name' },
              type: { type: 'string', description: 'Equipment type' },
              serialNumber: { type: 'string', description: 'Unique serial number' },
              description: { type: 'string', description: 'Optional description' },
              labId: { type: 'number', description: 'Lab ID where equipment is located' },
              status: {
                type: 'string',
                enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER'],
                default: 'AVAILABLE'
              }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Equipment created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 201 },
                body: { $ref: '#/components/schemas/EquipmentWithLab' }
              }
            }
          }
        }
      },
      400: responses[400],
      401: responses[401],
      403: responses[403],
      500: responses[500]
    }
  }
})

const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  description: z.string().optional(),
  labId: z.number().int().positive('Lab ID must be a positive integer'),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER']).default('AVAILABLE')
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
        'Insufficient permissions. Only administrators and instructors can create equipment.'
    })
  }

  return user
}

export default defineEventHandler(async (event) => {
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
    const validatedData = createEquipmentSchema.parse(body)

    // Check if lab exists
    const lab = await prisma.lab.findUnique({
      where: { id: validatedData.labId }
    })

    if (!lab) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Lab not found'
      })
    }

    // Check if serial number is unique
    const existingEquipment = await prisma.equipment.findUnique({
      where: { serialNumber: validatedData.serialNumber }
    })

    if (existingEquipment) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Equipment with this serial number already exists'
      })
    }

    const equipment = await prisma.equipment.create({
      data: validatedData,
      include: {
        lab: true
      }
    })

    return {
      status: 201,
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
      statusMessage: 'Failed to create equipment'
    })
  }
})
