import type { ReservationStatus } from '~/generated/prisma/enums'

/**
 * Computed reservation status including database status and time-based status
 */
export type ComputedReservationStatus = ReservationStatus | 'IN_PROGRESS' | 'COMPLETED'

/**
 * Reservation with time fields for status computation
 */
export interface ReservationWithTimes {
  status: ReservationStatus
  startTime: Date
  endTime: Date
}

/**
 * Computes the effective status of a reservation based on its database status and time.
 *
 * Logic:
 * - If reservation status is PENDING or CANCELLED, return that status (never changes)
 * - If reservation status is CONFIRMED:
 *   - If current time is before startTime → CONFIRMED
 *   - If current time is between startTime and endTime → IN_PROGRESS
 *   - If current time is after endTime → COMPLETED
 *
 * @param reservation Reservation object with status and time fields
 * @param currentTime Optional current time (defaults to now)
 * @returns Computed reservation status
 */
export function computeReservationStatus(
  reservation: ReservationWithTimes,
  currentTime: Date = new Date()
): ComputedReservationStatus {
  // PENDING and CANCELLED never change
  if (reservation.status === 'PENDING' || reservation.status === 'CANCELLED') {
    return reservation.status
  }

  // CONFIRMED reservations are time-dependent
  if (reservation.status === 'CONFIRMED') {
    const start = new Date(reservation.startTime)
    const end = new Date(reservation.endTime)

    if (currentTime < start) {
      return 'CONFIRMED'
    } else if (currentTime >= start && currentTime <= end) {
      return 'IN_PROGRESS'
    } else {
      return 'COMPLETED'
    }
  }

  return reservation.status
}

/**
 * Adds computed status to a single reservation object
 */
export function addComputedReservationStatus<T extends ReservationWithTimes>(
  reservation: T,
  currentTime?: Date
): T & { computedStatus: ComputedReservationStatus } {
  return {
    ...reservation,
    computedStatus: computeReservationStatus(reservation, currentTime)
  }
}

/**
 * Adds computed status to an array of reservation objects
 */
export function addComputedReservationStatusToMany<T extends ReservationWithTimes>(
  reservations: T[],
  currentTime?: Date
): Array<T & { computedStatus: ComputedReservationStatus }> {
  return reservations.map((reservation) => addComputedReservationStatus(reservation, currentTime))
}

/**
 * Validates if a status can be stored in the database
 */
export function isStorableReservationStatus(status: string): status is ReservationStatus {
  return ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)
}

/**
 * Validates if a status is computed (not stored in database)
 */
export function isComputedReservationStatus(status: string): boolean {
  return ['IN_PROGRESS', 'COMPLETED'].includes(status)
}
