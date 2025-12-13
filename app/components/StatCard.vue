<template>
  <UCard>
    <div class="flex items-center">
      <div class="flex items-center justify-center w-12 h-12 rounded-lg mr-4" :class="iconBgClass">
        <UIcon :name="icon" class="w-6 h-6" :class="iconClass" />
      </div>
      <div>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ value }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ label }}</p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  value: string | number
  label: string
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue'
})

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    icon: 'text-blue-600 dark:text-blue-400'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900',
    icon: 'text-green-600 dark:text-green-400'
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900',
    icon: 'text-purple-600 dark:text-purple-400'
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    icon: 'text-yellow-600 dark:text-yellow-400'
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900',
    icon: 'text-red-600 dark:text-red-400'
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-900',
    icon: 'text-gray-600 dark:text-gray-400'
  }
}

const iconBgClass = computed(() => colorClasses[props.color].bg)
const iconClass = computed(() => colorClasses[props.color].icon)
</script>
