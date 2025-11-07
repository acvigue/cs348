import type { EquipmentStatus } from '~/generated/prisma/enums'

/**
 * Merged equipment status including database status (OPERATIONAL, MAINTENANCE, OUT_OF_ORDER)
 * and computed reservation-based status (AVAILABLE, IN_USE)
 *
 * Note: In API responses, this is returned as the "status" field (not "computedStatus")
 */
export type ComputedEquipmentStatus = EquipmentStatus | 'AVAILABLE' | 'IN_USE'
