import type { Prisma } from '@/generated/prisma/client'
import type { ReservationStatus } from '~/generated/prisma/enums'
import prisma from '../../prisma'
import { isAdmin } from '../../middleware/session'
import { parameters, responses } from '../../utils/openapi'
import { addComputedStatus } from '../../utils/equipmentStatus'
import { addComputedReservationStatusToMany } from '../../utils/reservationStatus'
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination'
import type { ReservationFilterParams } from '~/types/filters'

defineRouteMeta({
  openAPI: {
    tags: ['Reservations'],
    summary: 'List reservations',
    description:
      'Retrieve a paginated list of reservations. Admins see all, users see only their own. Equipment status and reservation status are computed based on current time and reservations.',
    security: [{ sessionAuth: [] }],
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of reservations',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reservations: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ReservationWithDetails' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      401: responses[401]
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const rawQuery = getQuery(event) as ReservationFilterParams & Record<string, unknown>
  const { page, perPage, cursor } = parsePaginationQuery(rawQuery)
  const now = new Date()

  const where: Prisma.ReservationWhereInput = {}
  if (!isAdmin(user)) {
    where.userId = user.id
  }

  const andConditions: Prisma.ReservationWhereInput[] = []
  const statusParam = (rawQuery.status || rawQuery.statusFilter) as string | undefined
  if (statusParam && statusParam !== 'ALL') {
    const normalized = statusParam.toUpperCase()
    if (normalized === 'IN_PROGRESS') {
      andConditions.push({ status: 'CONFIRMED' })
      andConditions.push({ startTime: { lte: now } })
      andConditions.push({ endTime: { gte: now } })
    } else if (normalized === 'COMPLETED') {
      andConditions.push({ status: 'CONFIRMED' })
      andConditions.push({ endTime: { lt: now } })
    } else {
      andConditions.push({ status: normalized as ReservationStatus })
    }
  }

  if (andConditions.length) {
    where.AND = andConditions
  }

  const [total_results, reservations] = await prisma.$transaction([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      skip: cursor ? 1 : (page - 1) * perPage,
      take: perPage,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        equipment: {
          include: {
            equipment: {
              include: {
                lab: true,
                reservationLinks: {
                  where: {
                    reservation: {
                      status: 'CONFIRMED',
                      endTime: {
                        gte: now
                      }
                    }
                  },
                  select: {
                    reservation: {
                      select: {
                        status: true,
                        startTime: true,
                        endTime: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        user: true
      },
      orderBy: [{ startTime: 'desc' }, { id: 'desc' }]
    })
  ])

  const reservationsWithComputedStatus = addComputedReservationStatusToMany(
    reservations.map((reservation) => ({
      ...reservation,
      equipment: reservation.equipment.map((eq) => ({
        ...eq,
        equipment: addComputedStatus(eq.equipment)
      }))
    }))
  )

  const totalPages = Math.max(1, Math.ceil(total_results / perPage))
  const nextCursor = page < totalPages ? (reservations.at(-1)?.id ?? null) : null
  const prevCursor = page > 1 ? (reservations.at(0)?.id ?? null) : null

  return {
    reservations: reservationsWithComputedStatus,
    pagination: buildPaginationMeta({
      page,
      perPage,
      totalResults: total_results,
      nextCursor,
      prevCursor
    })
  }
})
