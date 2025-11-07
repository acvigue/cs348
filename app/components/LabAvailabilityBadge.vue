<template>
  <UBadge :color="availabilityColor" :variant="variant" :size="size">
    {{ availabilityLabel }}
  </UBadge>
</template>

<script setup lang="ts">
import type { LabAvailability } from '~/generated/prisma/enums'

interface Props {
  availability: LabAvailability
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'subtle',
  size: 'md'
})

const availabilityColors: Record<LabAvailability, 'success' | 'neutral' | 'error'> = {
  EMPTY: 'success',
  IN_USE: 'neutral',
  FULL: 'error'
}

const availabilityLabels: Record<LabAvailability, string> = {
  EMPTY: 'Available',
  IN_USE: 'Partially Available',
  FULL: 'Full'
}

const availabilityColor = computed(() => availabilityColors[props.availability])
const availabilityLabel = computed(() => availabilityLabels[props.availability])
</script>
