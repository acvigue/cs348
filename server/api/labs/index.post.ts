import prisma from '../../prisma'
import { z } from 'zod'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'Create new lab',
    description: 'Create a new lab. Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['building', 'roomNumber', 'capacity'],
            properties: {
              building: { type: 'string', description: 'Building name' },
              roomNumber: { type: 'string', description: 'Room number' },
              capacity: { type: 'number', description: 'Maximum capacity' },
              description: { type: 'string', description: 'Optional description' }
            }
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Lab created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 201 },
                body: { $ref: '#/components/schemas/LabWithEquipment' }
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

const createLabSchema = z.object({
  building: z.string().min(1, 'Building is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  description: z.string().optional()
})

async function checkAdminPermissions(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user || user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions. Only administrators can create labs.'
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
  await checkAdminPermissions(event.context.session.data.user_id)

  try {
    const body = await readBody(event)
    const validatedData = createLabSchema.parse(body)

    // Check if lab with same building and room number already exists
    const existingLab = await prisma.lab.findUnique({
      where: {
        building_roomNumber: {
          building: validatedData.building,
          roomNumber: validatedData.roomNumber
        }
      }
    })

    if (existingLab) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Lab with this building and room number already exists'
      })
    }

    const lab = await prisma.lab.create({
      data: validatedData,
      include: {
        equipment: true,
        _count: {
          select: {
            equipment: true
          }
        }
      }
    })

    return {
      status: 201,
      body: lab
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
      statusMessage: 'Failed to create lab'
    })
  }
})
