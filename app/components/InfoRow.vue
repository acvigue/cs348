<template>
  <div class="flex items-start gap-2">
    <UIcon :name="icon" class="w-5 h-5 text-gray-400 mt-0.5" />
    <div>
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        <slot>{{ value }}</slot>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  label: string
  value?: string
}

defineProps<Props>()
</script>
