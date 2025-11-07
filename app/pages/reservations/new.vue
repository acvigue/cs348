<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'New Reservation - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'Create a new lab equipment reservation'
    }
  ]
})

const router = useRouter()
const toast = useToast()

// Fetch labs and equipment
const { data: labsData } = await useFetch('/api/labs', {
  query: { results_per_page: 100 }
})
const { data: equipmentData } = await useFetch('/api/equipment', {
  query: { results_per_page: 1000 }
})

const labs = computed(() => labsData.value?.labs || [])
const allEquipment = computed(() => equipmentData.value?.equipment || [])

// Selected lab for filtering equipment
const selectedLabId = ref<{ id: number; label: string; description: string } | undefined>(undefined)

// Filter equipment by selected lab
const availableEquipment = computed(() => {
  if (!selectedLabId.value) return []
  return allEquipment.value.filter((eq) => eq.labId === selectedLabId.value?.id)
})

// Round time to next 15-minute block
const roundToNext15Minutes = (date: Date) => {
  const minutes = date.getMinutes()
  const remainder = minutes % 15
  if (remainder === 0) return date
  const roundedMinutes = minutes + (15 - remainder)
  const newDate = new Date(date)
  newDate.setMinutes(roundedMinutes, 0, 0)
  return newDate
}

// Get default start time (next 15-minute block)
const getDefaultStartTime = () => {
  const now = new Date()
  return roundToNext15Minutes(now)
}

// Get default end time (2 hours after start)
const getDefaultEndTime = (startTime: Date) => {
  const end = new Date(startTime)
  end.setHours(end.getHours() + 2)
  return end
}

// Format date for datetime-local input
const formatDateTimeLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const defaultStart = getDefaultStartTime()
const defaultEnd = getDefaultEndTime(defaultStart)

// Zod schema for validation
const schema = z
  .object({
    labId: z.number({ error: 'Please select a lab' }).min(1, 'Please select a lab'),
    equipmentIds: z
      .array(z.number())
      .min(1, 'Please select at least one equipment item')
      .max(10, 'Cannot select more than 10 equipment items'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    purpose: z.string().min(5, 'Purpose must be at least 5 characters').max(500),
    notes: z.string().max(1000).optional()
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime)
      const end = new Date(data.endTime)
      return end > start
    },
    {
      message: 'End time must be after start time',
      path: ['endTime']
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime)
      const now = new Date()
      return start > now
    },
    {
      message: 'Start time must be in the future',
      path: ['startTime']
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime)
      const end = new Date(data.endTime)
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return duration <= 8
    },
    {
      message: 'Reservation cannot exceed 8 hours',
      path: ['endTime']
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startTime)
      const end = new Date(data.endTime)
      const isValid15Min = (date: Date) => {
        const minutes = date.getMinutes()
        return [0, 15, 30, 45].includes(minutes)
      }
      return isValid15Min(start) && isValid15Min(end)
    },
    {
      message: 'Times must be on 15-minute blocks (00, 15, 30, or 45 minutes)',
      path: ['startTime']
    }
  )

type Schema = z.output<typeof schema>

// Form state
const state = reactive<Schema>({
  labId: 0,
  equipmentIds: [],
  startTime: formatDateTimeLocal(defaultStart),
  endTime: formatDateTimeLocal(defaultEnd),
  purpose: '',
  notes: ''
})

const loading = ref(false)
const error = ref('')

// Watch lab selection to reset equipment
watch(selectedLabId, (newLabId) => {
  if (newLabId) {
    state.labId = newLabId.id
    state.equipmentIds = []
  }
})

// Lab options for select
const labOptions = computed(() =>
  labs.value.map((lab) => ({
    id: lab.id,
    label: `${lab.building} ${lab.roomNumber}`,
    description: lab.description || undefined
  }))
)

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/reservations', {
      method: 'POST',
      body: {
        equipmentIds: event.data.equipmentIds,
        startTime: new Date(event.data.startTime).toISOString(),
        endTime: new Date(event.data.endTime).toISOString(),
        purpose: event.data.purpose,
        notes: event.data.notes || undefined
      }
    })

    toast.add({
      title: 'Success',
      description: 'Reservation created successfully',
      color: 'success'
    })

    if (result?.reservation?.id) {
      router.push(`/reservations/${result.reservation.id}`)
    } else {
      router.push('/reservations')
    }
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message || 'Failed to create reservation'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UContainer class="py-8 max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <UButton to="/reservations" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4">
          Back to Reservations
        </UButton>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">New Reservation</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Reserve lab equipment for your project or research.
        </p>
      </div>

      <!-- Form -->
      <UCard>
        <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
          <!-- Lab Selection -->
          <UFormField label="Lab" name="labId" required>
            <USelectMenu v-model="selectedLabId" :items="labOptions" placeholder="Select a lab" />
            <template #hint> Select the lab where the equipment is located </template>
          </UFormField>

          <!-- Equipment Selection -->
          <UFormField v-if="selectedLabId" label="Equipment" name="equipmentIds" required>
            <div class="space-y-3">
              <div
                v-for="equipment in availableEquipment"
                :key="equipment.id"
                class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <UCheckbox
                  :id="`equipment-${equipment.id}`"
                  :model-value="state.equipmentIds.includes(equipment.id)"
                  :disabled="equipment.status !== 'AVAILABLE'"
                  @update:model-value="
                    (checked) => {
                      if (checked) {
                        state.equipmentIds.push(equipment.id)
                      } else {
                        state.equipmentIds = state.equipmentIds.filter((id) => id !== equipment.id)
                      }
                    }
                  "
                />
                <label :for="`equipment-${equipment.id}`" class="flex-1 cursor-pointer">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ equipment.name }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ equipment.type }} • {{ equipment.serialNumber }}
                      </p>
                    </div>
                    <EquipmentStatusBadge :status="equipment.status" />
                  </div>
                </label>
              </div>
              <p
                v-if="availableEquipment.length === 0"
                class="text-sm text-gray-500 text-center py-4"
              >
                No equipment available in this lab
              </p>
            </div>
            <template #hint>
              Select the equipment you need (max 10 items, must be from same lab)
            </template>
          </UFormField>

          <!-- Date/Time Selection -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UFormField label="Start Time" name="startTime" required>
              <UInput v-model="state.startTime" type="datetime-local" :step="900" />
              <template #hint> Must be on a 15-minute block (00, 15, 30, 45) </template>
            </UFormField>

            <UFormField label="End Time" name="endTime" required>
              <UInput v-model="state.endTime" type="datetime-local" :step="900" />
              <template #hint> Maximum 8 hours from start time </template>
            </UFormField>
          </div>

          <!-- Purpose -->
          <UFormField label="Purpose" name="purpose" required>
            <UTextarea
              v-model="state.purpose"
              placeholder="Describe the purpose of your reservation..."
              :rows="3"
              :maxlength="500"
            />
            <template #hint> {{ state.purpose.length }}/500 characters </template>
          </UFormField>

          <!-- Notes (Optional) -->
          <UFormField label="Notes (Optional)" name="notes">
            <UTextarea
              v-model="state.notes"
              placeholder="Any additional notes or requirements..."
              :rows="3"
              :maxlength="1000"
            />
            <template #hint> {{ state.notes?.length || 0 }}/1000 characters </template>
          </UFormField>

          <!-- Error Alert -->
          <UAlert
            v-if="error"
            color="error"
            icon="i-heroicons-information-circle-20-solid"
            :title="error"
          />

          <!-- Submit Button -->
          <div class="flex gap-3 justify-end pt-4">
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              @click="router.push('/reservations')"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              icon="i-heroicons-check"
              :loading="loading"
              :disabled="!selectedLabId || state.equipmentIds.length === 0"
            >
              Create Reservation
            </UButton>
          </div>
        </UForm>
      </UCard>

      <!-- Help Info -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Reservation Guidelines
            </h3>
          </div>
        </template>

        <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Reservations must be made at least in the future</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Time slots must be on 15-minute blocks (e.g., 10:00, 10:15, 10:30, 10:45)</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Maximum reservation duration is 8 hours</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>All equipment must be from the same lab</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>
              Your reservation will be pending until confirmed by an instructor or admin
            </span>
          </li>
        </ul>
      </UCard>
    </UContainer>
  </div>
</template>
