<template>
  <UCard v-if="asCard">
    <div class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
    </div>
  </UCard>
  <div v-else class="flex items-center justify-center py-12">
    <UIcon name="i-heroicons-arrow-path" :class="sizeClass" class="animate-spin" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  asCard?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  asCard: true,
  size: 'md'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-4 h-4'
    case 'lg':
      return 'w-8 h-8'
    default:
      return 'w-6 h-6'
  }
})
</script>
