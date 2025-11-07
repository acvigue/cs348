import prisma from '../../../prisma'
import { z } from 'zod'
import { parameters, responses } from '../../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'Update lab',
    description: 'Update lab information. Requires ADMIN role.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.id],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              building: { type: 'string', description: 'Building name' },
              roomNumber: { type: 'string', description: 'Room number' },
              capacity: { type: 'number', description: 'Maximum capacity' },
              description: { type: 'string', description: 'Description' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Lab updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'number', example: 200 },
                body: { $ref: '#/components/schemas/LabWithEquipment' }
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

const updateLabSchema = z.object({
  building: z.string().min(1, 'Building is required').optional(),
  roomNumber: z.string().min(1, 'Room number is required').optional(),
  capacity: z.number().int().positive('Capacity must be a positive integer').optional(),
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
      statusMessage: 'Insufficient permissions. Only administrators can update labs.'
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
    const body = await readBody(event)
    const validatedData = updateLabSchema.parse(body)

    // Check if lab exists
    const existingLab = await prisma.lab.findUnique({
      where: { id: Number(labId) }
    })

    if (!existingLab) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Lab not found'
      })
    }

    // Check if building and room number combination is unique (if either is being updated)
    if (validatedData.building || validatedData.roomNumber) {
      const newBuilding = validatedData.building || existingLab.building
      const newRoomNumber = validatedData.roomNumber || existingLab.roomNumber

      // Only check if the combination is actually different
      if (newBuilding !== existingLab.building || newRoomNumber !== existingLab.roomNumber) {
        const duplicateLab = await prisma.lab.findUnique({
          where: {
            building_roomNumber: {
              building: newBuilding,
              roomNumber: newRoomNumber
            }
          }
        })

        if (duplicateLab) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Lab with this building and room number already exists'
          })
        }
      }
    }

    const lab = await prisma.lab.update({
      where: { id: Number(labId) },
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
      status: 200,
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
      statusMessage: 'Failed to update lab'
    })
  }
})
