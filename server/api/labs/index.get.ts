import type { Prisma } from '@/generated/prisma/client'
import prisma from '../../prisma'
import { LabAvailability } from '~/generated/prisma/enums'
import { parameters, responses } from '../../utils/openapi'
import { computeEquipmentStatus } from '../../utils/equipmentStatus'
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/pagination'
import type { LabFilterParams } from '~/types/filters'

defineRouteMeta({
  openAPI: {
    tags: ['Labs'],
    summary: 'List all labs',
    description: 'Retrieve a paginated list of all labs with equipment counts and availability',
    parameters: [parameters.page, parameters.resultsPerPage],
    responses: {
      200: {
        description: 'List of labs',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                labs: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/LabWithEquipment' }
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
    const rawQuery = getQuery(event) as LabFilterParams & Record<string, unknown>
    const { page, perPage, cursor } = parsePaginationQuery(rawQuery)
    const now = new Date()

    const where: Prisma.LabWhereInput = {}
    const andConditions: Prisma.LabWhereInput[] = []

    const search = typeof rawQuery.search === 'string' ? rawQuery.search.trim() : undefined
    if (search) {
      where.OR = [
        { building: { contains: search, mode: 'insensitive' } },
        { roomNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    const activeEquipmentCondition: Prisma.EquipmentWhereInput = {
      reservationLinks: {
        some: {
          reservation: {
            status: 'CONFIRMED',
            startTime: { lte: now },
            endTime: { gte: now }
          }
        }
      }
    }

    const availabilityParam = (rawQuery.availability || rawQuery.availabilityFilter) as
      | string
      | undefined
    if (availabilityParam && availabilityParam !== 'ALL') {
      const normalized = availabilityParam.toUpperCase() as LabAvailability
      if (normalized === LabAvailability.EMPTY) {
        andConditions.push({
          equipment: {
            none: activeEquipmentCondition
          }
        })
      } else if (normalized === LabAvailability.FULL) {
        andConditions.push({ equipment: { some: {} } })
        andConditions.push({
          equipment: {
            every: activeEquipmentCondition
          }
        })
      } else if (normalized === LabAvailability.IN_USE) {
        andConditions.push({
          equipment: {
            some: activeEquipmentCondition
          }
        })
        andConditions.push({
          equipment: {
            some: {
              NOT: activeEquipmentCondition
            }
          }
        })
      }
    }

    if (andConditions.length) {
      where.AND = andConditions
    }

    const [total_results, labs] = await prisma.$transaction([
      prisma.lab.count({ where }),
      prisma.lab.findMany({
        where,
        skip: cursor ? 1 : (page - 1) * perPage,
        take: perPage,
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
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
          },
          _count: {
            select: {
              equipment: true
            }
          }
        },
        orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }]
      })
    ])

    const currentTime = new Date()
    const labsWithAvailability = labs.map((lab) => {
      let availableCount = 0
      let unavailableCount = 0

      if (lab.equipment.length > 0) {
        lab.equipment.forEach((equipment) => {
          const status = computeEquipmentStatus(equipment, currentTime)
          if (status === 'IN_USE') {
            unavailableCount++
          } else {
            availableCount++
          }
        })
      }

      let availability: LabAvailability = LabAvailability.EMPTY
      if (availableCount === 0 && lab.equipment.length > 0) {
        availability = LabAvailability.FULL
      } else if (availableCount > 0 && unavailableCount > 0) {
        availability = LabAvailability.IN_USE
      } else if (availableCount === lab.equipment.length && lab.equipment.length > 0) {
        availability = LabAvailability.EMPTY
      }

      return { ...lab, availability }
    })

    const totalPages = Math.max(1, Math.ceil(total_results / perPage))
    const nextCursor = page < totalPages ? (labs.at(-1)?.id ?? null) : null
    const prevCursor = page > 1 ? (labs.at(0)?.id ?? null) : null

    return {
      labs: labsWithAvailability,
      pagination: buildPaginationMeta({
        page,
        perPage,
        totalResults: total_results,
        nextCursor,
        prevCursor
      })
    }
  } catch (error) {
    console.error('Failed to fetch labs', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch labs'
    })
  }
})
