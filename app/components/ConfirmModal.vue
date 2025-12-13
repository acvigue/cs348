<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">{{ description }}</p>

          <UAlert
            v-if="warningMessage"
            color="warning"
            icon="i-heroicons-information-circle"
            :title="warningTitle || 'Warning'"
            :description="warningMessage"
          />
        </div>

        <template #footer>
          <div class="flex gap-3 justify-end">
            <UButton variant="outline" color="neutral" :disabled="loading" @click="handleCancel">
              Cancel
            </UButton>
            <UButton
              :color="confirmColor"
              :icon="confirmIcon"
              :loading="loading"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  description: string
  confirmText?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success'
  confirmIcon?: string
  warningMessage?: string
  warningTitle?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  confirmColor: 'error',
  confirmIcon: 'i-heroicons-trash',
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>
