import type { Prisma } from '@/generated/prisma/client'
import type { EquipmentStatus } from '~/generated/prisma/enums'
import prisma from '../../prisma'
import { parameters, responses } from '../../utils/openapi'
import { addComputedStatusToMany } from '../../utils/equipmentStatus'
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination'
import type { EquipmentFilterParams } from '~/types/filters'

defineRouteMeta({
  openAPI: {
    tags: ['Equipment'],
    summary: 'List all equipment',
    description:
      'Retrieve a paginated list of all equipment with their associated labs and active reservations. Status is computed based on current reservations.',
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of equipment',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                equipment: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/EquipmentWithLab' }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        }
      },
      500: responses[500]
    }
  }
})

export default defineEventHandler(async (event) => {
  try {
    const rawQuery = getQuery(event) as EquipmentFilterParams & Record<string, unknown>
    const { page, perPage, cursor } = parsePaginationQuery(rawQuery)
    const now = new Date()

    const where: Prisma.EquipmentWhereInput = {}
    const andConditions: Prisma.EquipmentWhereInput[] = []

    const labIdInput = rawQuery.lab_id ?? rawQuery.labId
    const labIdValue = labIdInput !== undefined ? Number(labIdInput) : undefined
    if (labIdValue !== undefined && Number.isFinite(labIdValue)) {
      andConditions.push({ labId: labIdValue })
    }

    const search = typeof rawQuery.search === 'string' ? rawQuery.search.trim() : undefined
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    const statusParam = (rawQuery.status || rawQuery.statusFilter) as string | undefined
    if (statusParam && statusParam !== 'ALL') {
      const normalized = statusParam.toUpperCase()
      if (normalized === 'AVAILABLE') {
        andConditions.push({ status: 'OPERATIONAL' })
        andConditions.push({
          reservationLinks: {
            none: {
              reservation: {
                status: 'CONFIRMED',
                startTime: { lte: now },
                endTime: { gte: now }
              }
            }
          }
        })
      } else if (normalized === 'IN_USE') {
        andConditions.push({
          reservationLinks: {
            some: {
              reservation: {
                status: 'CONFIRMED',
                startTime: { lte: now },
                endTime: { gte: now }
              }
            }
          }
        })
      } else {
        andConditions.push({ status: normalized as EquipmentStatus })
      }
    }

    if (andConditions.length) {
      where.AND = andConditions
    }

    const [total_results, equipment] = await prisma.$transaction([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        skip: cursor ? 1 : (page - 1) * perPage,
        take: perPage,
        cursor: cursor ? { id: cursor } : undefined,
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
            include: {
              reservation: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }]
      })
    ])

    const equipmentWithStatus = addComputedStatusToMany(equipment)
    const totalPages = Math.max(1, Math.ceil(total_results / perPage))
    const nextCursor = page < totalPages ? (equipment.at(-1)?.id ?? null) : null
    const prevCursor = page > 1 ? (equipment.at(0)?.id ?? null) : null

    return {
      equipment: equipmentWithStatus,
      pagination: buildPaginationMeta({
        page,
        perPage,
        totalResults: total_results,
        nextCursor,
        prevCursor
      })
    }
  } catch (error) {
    console.error('Failed to fetch equipment', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch equipment'
    })
  }
})
