<template>
  <UCard>
    <div class="text-center py-12">
      <UIcon :name="icon" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">{{ title }}</h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {{ description }}
      </p>
      <slot name="action" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  title: string
  description: string
}

defineProps<Props>()
</script>
