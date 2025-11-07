import type { EquipmentStatus } from '~/generated/prisma/enums'

/**
 * Computed equipment status including database status and reservation-based status
 */
export type ComputedEquipmentStatus = EquipmentStatus | 'AVAILABLE' | 'IN_USE'

/**
 * Equipment with reservation links for status computation
 */
export interface EquipmentWithReservations {
  id: number
  status: EquipmentStatus
  reservationLinks?: Array<{
    reservation: {
      status: string
      startTime: Date
      endTime: Date
    }
  }>
}

/**
 * Computes the effective status of equipment based on its database status and active reservations.
 *
 * Logic:
 * - If equipment status is MAINTENANCE or OUT_OF_ORDER, return that status
 * - If equipment status is OPERATIONAL:
 *   - Check for active confirmed/in-progress reservations that overlap with current time
 *   - If found, return IN_USE
 *   - Otherwise, return AVAILABLE
 *
 * @param equipment Equipment object with optional reservationLinks
 * @param currentTime Optional current time (defaults to now)
 * @returns Computed equipment status
 */
export function computeEquipmentStatus(
  equipment: EquipmentWithReservations,
  currentTime: Date = new Date()
): ComputedEquipmentStatus {
  // If equipment is in maintenance or out of order, that takes precedence
  if (equipment.status === 'MAINTENANCE' || equipment.status === 'OUT_OF_ORDER') {
    return equipment.status
  }

  // If equipment is operational, check for active reservations
  if (equipment.reservationLinks && equipment.reservationLinks.length > 0) {
    const hasActiveReservation = equipment.reservationLinks.some((link) => {
      const reservation = link.reservation
      return (
        reservation.status === 'CONFIRMED' &&
        new Date(reservation.startTime) <= currentTime &&
        new Date(reservation.endTime) >= currentTime
      )
    })

    if (hasActiveReservation) {
      return 'IN_USE'
    }
  }

  // If operational and no active reservations, it's available
  return 'AVAILABLE'
}

/**
 * Adds computed status to a single equipment object, replacing the database status
 * with the merged computed status (union of database status and reservation-based status).
 * Also includes the original database status as `dbStatus` for editing purposes.
 */
export function addComputedStatus<T extends EquipmentWithReservations>(
  equipment: T,
  currentTime?: Date
): Omit<T, 'status'> & { status: ComputedEquipmentStatus; dbStatus: EquipmentStatus } {
  const { status: originalStatus, ...rest } = equipment
  return {
    ...rest,
    status: computeEquipmentStatus(equipment, currentTime),
    dbStatus: originalStatus
  } as Omit<T, 'status'> & { status: ComputedEquipmentStatus; dbStatus: EquipmentStatus }
}

/**
 * Adds computed status to an array of equipment objects, replacing the database status
 * with the merged computed status. Also includes the original database status as `dbStatus`.
 */
export function addComputedStatusToMany<T extends EquipmentWithReservations>(
  equipmentList: T[],
  currentTime?: Date
): Array<Omit<T, 'status'> & { status: ComputedEquipmentStatus; dbStatus: EquipmentStatus }> {
  return equipmentList.map((equipment) => addComputedStatus(equipment, currentTime))
}

/**
 * Validates if a status can be stored in the database
 */
export function isStorableStatus(status: string): status is EquipmentStatus {
  return ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER'].includes(status)
}

/**
 * Validates if a status is computed (not stored in database)
 */
export function isComputedStatus(status: string): boolean {
  return ['AVAILABLE', 'IN_USE'].includes(status)
}
