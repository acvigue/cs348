<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { EquipmentStatus } from '~/generated/prisma/enums'

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'Add New Equipment - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'Add new equipment to the lab inventory'
    }
  ]
})

const router = useRouter()
const toast = useToast()
const { user } = await useUser()

// Check permissions
const canManageEquipment = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

// Redirect if not authorized
if (!canManageEquipment.value) {
  navigateTo('/equipment')
}

// Fetch labs
const { data: labsData } = await useFetch('/api/labs', {
  query: { results_per_page: 100 }
})

const labs = computed(() => labsData.value?.labs || [])

// Zod schema for validation
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  description: z.string().optional(),
  labId: z.number({ message: 'Lab is required' }),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER'])
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive({
  name: '',
  type: '',
  serialNumber: '',
  description: '',
  labId: 0,
  status: 'OPERATIONAL' as EquipmentStatus
})

const loading = ref(false)
const error = ref('')

// Lab options for select
const labOptions = computed(() =>
  labs.value.map((lab) => ({
    id: lab.id,
    label: `${lab.building} ${lab.roomNumber}`,
    description: lab.description ?? undefined
  }))
)

const selectedLab = ref<{ id: number; label: string; description: string | undefined } | undefined>(
  undefined
)

// Watch lab selection
watch(selectedLab, (newLab) => {
  if (newLab) {
    state.labId = newLab.id
  }
})

// Status options
const statusOptions = [
  { label: 'Operational', value: 'OPERATIONAL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Out of Order', value: 'OUT_OF_ORDER' }
]

const selectedStatus = computed({
  get: () => statusOptions.find((opt) => opt.value === state.status) || statusOptions[0],
  set: (val) => {
    if (val) state.status = val.value as EquipmentStatus
  }
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/equipment', {
      method: 'POST',
      body: {
        name: event.data.name,
        type: event.data.type,
        serialNumber: event.data.serialNumber,
        description: event.data.description || undefined,
        labId: event.data.labId,
        status: event.data.status
      }
    })

    toast.add({
      title: 'Success',
      description: 'Equipment added successfully',
      color: 'success'
    })

    if (result?.body?.id) {
      router.push(`/equipment/${result.body.id}`)
    } else {
      router.push('/equipment')
    }
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message || 'Failed to add equipment'
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
        <UButton to="/equipment" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4">
          Back to Equipment
        </UButton>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Add New Equipment</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Add a new equipment item to the lab inventory.
        </p>
      </div>

      <!-- Form -->
      <UCard>
        <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
          <!-- Name -->
          <UFormField label="Equipment Name" name="name" required>
            <UInput v-model="state.name" placeholder="e.g., Oscilloscope X200" :maxlength="100" />
            <template #hint> Descriptive name for the equipment </template>
          </UFormField>

          <!-- Type -->
          <UFormField label="Equipment Type" name="type" required>
            <UInput
              v-model="state.type"
              placeholder="e.g., Oscilloscope, Microscope, 3D Printer"
              :maxlength="50"
            />
            <template #hint> Category or type of equipment </template>
          </UFormField>

          <!-- Serial Number -->
          <UFormField label="Serial Number" name="serialNumber" required>
            <UInput v-model="state.serialNumber" placeholder="e.g., SN-12345-XYZ" :maxlength="50" />
            <template #hint> Unique serial number for tracking </template>
          </UFormField>

          <!-- Description -->
          <UFormField label="Description (Optional)" name="description">
            <UTextarea
              v-model="state.description"
              placeholder="Additional details about the equipment..."
              :rows="3"
              :maxlength="500"
            />
            <template #hint> {{ state.description?.length || 0 }}/500 characters </template>
          </UFormField>

          <!-- Lab Selection -->
          <UFormField label="Lab Location" name="labId" required>
            <USelectMenu v-model="selectedLab" :items="labOptions" placeholder="Select a lab" />
            <template #hint> Lab where this equipment is located </template>
          </UFormField>

          <!-- Status -->
          <UFormField label="Status" name="status" required>
            <USelectMenu v-model="selectedStatus" :items="statusOptions" />
            <template #hint> Current operational status of the equipment </template>
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
              @click="router.push('/equipment')"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              icon="i-heroicons-check"
              :loading="loading"
              :disabled="!selectedLab"
            >
              Add Equipment
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
              Equipment Guidelines
            </h3>
          </div>
        </template>

        <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Provide a clear and descriptive name for easy identification</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Serial number must be unique across all equipment</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Set appropriate status to indicate availability</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
            <span>Include relevant details in the description for users</span>
          </li>
        </ul>
      </UCard>
    </UContainer>
  </div>
</template>
