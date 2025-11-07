import prisma from '../../prisma'
import { ReservationStatus } from '~/generated/prisma/enums'
import { responses } from '../../utils/openapi'

defineRouteMeta({
  openAPI: {
    tags: ['Reservations'],
    summary: 'Create reservation',
    description:
      'Create a new equipment reservation. Times must be on 15-minute blocks, max 8 hours.',
    security: [{ sessionAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['equipmentIds', 'startTime', 'endTime', 'purpose'],
            properties: {
              equipmentIds: {
                type: 'array',
                items: { type: 'number' },
                description: 'Array of equipment IDs (must all be in same lab)'
              },
              startTime: {
                type: 'string',
                format: 'date-time',
                description: 'Start time (must be on 15-minute block)'
              },
              endTime: {
                type: 'string',
                format: 'date-time',
                description: 'End time (must be on 15-minute block)'
              },
              purpose: { type: 'string', description: 'Purpose of reservation' },
              notes: { type: 'string', description: 'Optional notes' }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Reservation created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reservation: { $ref: '#/components/schemas/Reservation' }
              }
            }
          }
        }
      },
      400: responses[400],
      401: responses[401],
      403: responses[403],
      409: responses[409]
    }
  }
})

function isValidBlock(date: Date) {
  const mins = date.getMinutes()
  return [0, 15, 30, 45].includes(mins) && date.getSeconds() === 0 && date.getMilliseconds() === 0
}
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { equipmentIds, startTime, endTime, purpose, notes } = body
  if (
    !Array.isArray(equipmentIds) ||
    equipmentIds.length === 0 ||
    !startTime ||
    !endTime ||
    !purpose
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (!isValidBlock(start) || !isValidBlock(end)) {
    throw createError({ statusCode: 400, statusMessage: 'Times must be on 15 minute blocks' })
  }
  if (end <= start) {
    throw createError({ statusCode: 400, statusMessage: 'End time must be after start time' })
  }
  // Only allow up to 8 hours
  if ((end.getTime() - start.getTime()) / (1000 * 60 * 60) > 8) {
    throw createError({ statusCode: 400, statusMessage: 'Reservation cannot exceed 8 hours' })
  }
  // Only allow future reservations
  if (start < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Reservation must be in the future' })
  }
  // Only students, instructors, admins can create
  if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Fetch all equipment and check they exist and are in the same lab
  const equipmentList = await prisma.equipment.findMany({
    where: { id: { in: equipmentIds } },
    select: { id: true, labId: true }
  })
  if (equipmentList.length !== equipmentIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'One or more equipment IDs are invalid' })
  }
  const labId = equipmentList[0].labId
  if (!equipmentList.every((eq) => eq.labId === labId)) {
    throw createError({ statusCode: 400, statusMessage: 'All equipment must be in the same lab' })
  }

  // Check for time overlaps in the lab (any reservation for this lab, any equipment, overlapping time)
  const overlappingLabReservations = await prisma.reservationEquipment.findFirst({
    where: {
      equipment: { labId },
      reservation: {
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      }
    }
  })
  if (overlappingLabReservations) {
    throw createError({
      statusCode: 409,
      statusMessage: 'There is a conflicting reservation in this lab for the selected time'
    })
  }

  // Check for time overlaps for each equipment
  const overlappingEquipment = await prisma.reservationEquipment.findFirst({
    where: {
      equipmentId: { in: equipmentIds },
      reservation: {
        startTime: { lt: end },
        endTime: { gt: start },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      }
    }
  })
  if (overlappingEquipment) {
    throw createError({
      statusCode: 409,
      statusMessage: 'One or more equipment items are already reserved for the selected time'
    })
  }

  // Instructors cannot confirm their own
  const status = user.role === 'INSTRUCTOR' ? ReservationStatus.PENDING : ReservationStatus.PENDING

  // Create reservation and link equipment
  const reservation = await prisma.reservation.create({
    data: {
      userId: user.id,
      startTime: start,
      endTime: end,
      purpose,
      notes,
      status,
      equipment: {
        create: equipmentIds.map((equipmentId) => ({ equipmentId }))
      }
    },
    include: {
      equipment: true
    }
  })
  return { reservation }
})
