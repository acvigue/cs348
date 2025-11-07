<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'default'
})

const toast = useToast()
const router = useRouter()
const { user } = await useUser()

// Check permissions
const canManageLabs = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

// Redirect if no permissions
if (!canManageLabs.value) {
  await navigateTo('/labs')
}

useHead({
  title: 'Add Lab - Lab Equipment Reservation System'
})

// Zod schema for validation
const schema = z.object({
  building: z.string().min(1, 'Building is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  description: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1')
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive({
  building: '',
  roomNumber: '',
  description: '',
  capacity: 1
})

const loading = ref(false)
const error = ref('')

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/labs', {
      method: 'POST',
      body: {
        building: event.data.building,
        roomNumber: event.data.roomNumber,
        description: event.data.description || undefined,
        capacity: event.data.capacity
      }
    })

    toast.add({
      title: 'Success',
      description: 'Lab created successfully',
      color: 'success'
    })

    // Redirect to the new lab's detail page
    const labId = (response as { body?: { id?: number } })?.body?.id
    if (labId) {
      router.push(`/labs/${labId}`)
    } else {
      router.push('/labs')
    }
  } catch (err) {
    error.value = (err as { data?: { message?: string } })?.data?.message || 'Failed to create lab'
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UContainer class="py-8 max-w-3xl">
      <UButton variant="ghost" icon="i-heroicons-arrow-left" to="/labs" class="mb-4">
        Back to Labs
      </UButton>

      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Add New Lab</h1>
        <p class="text-gray-600 dark:text-gray-400">Create a new laboratory space in the system</p>
      </div>

      <UCard>
        <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
          <UFormGroup label="Building" name="building" required>
            <UInput v-model="state.building" placeholder="e.g., Engineering Building" />
            <template #hint>
              <span class="text-sm text-gray-500">The building where the lab is located</span>
            </template>
          </UFormGroup>

          <UFormGroup label="Room Number" name="roomNumber" required>
            <UInput v-model="state.roomNumber" placeholder="e.g., 101" />
            <template #hint>
              <span class="text-sm text-gray-500">The room number or identifier</span>
            </template>
          </UFormGroup>

          <UFormGroup label="Capacity" name="capacity" required>
            <UInput v-model.number="state.capacity" type="number" min="1" />
            <template #hint>
              <span class="text-sm text-gray-500">
                Maximum number of people that can use the lab
              </span>
            </template>
          </UFormGroup>

          <UFormGroup label="Description" name="description">
            <UTextarea
              v-model="state.description"
              placeholder="Describe the lab and its purpose"
              :rows="4"
            />
            <template #hint>
              <span class="text-sm text-gray-500">Optional details about the lab</span>
            </template>
          </UFormGroup>

          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            :title="error"
            icon="i-heroicons-exclamation-circle"
          />

          <div class="flex gap-2 pt-4">
            <UButton type="submit" :loading="loading" icon="i-heroicons-plus"> Create Lab </UButton>
            <UButton variant="outline" to="/labs"> Cancel </UButton>
          </div>
        </UForm>
      </UCard>
    </UContainer>
  </div>
</template>
