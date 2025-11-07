import type { EquipmentStatus } from '~/generated/prisma/enums'

/**
 * Computed equipment status including database status and reservation-based status
 */
export type ComputedEquipmentStatus = EquipmentStatus | 'AVAILABLE' | 'IN_USE'
