<script setup lang="ts">
import type { LabAvailability } from '~/generated/prisma/enums'

definePageMeta({
  layout: 'default'
})

useHead({
  title: 'Labs - Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content: 'Browse and manage labs'
    }
  ]
})

const { user } = await useUser()
const toast = useToast()

// Check if user is instructor or admin
const canManageLabs = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

// Pagination and filtering
const page = ref(1)
const perPage = ref(20)
const availabilityFilter = ref<LabAvailability | 'ALL'>('ALL')

// Fetch labs
const {
  data: labsData,
  pending,
  refresh
} = await useFetch('/api/labs', {
  query: {
    page,
    results_per_page: perPage
  },
  watch: [page, perPage]
})

const labs = computed(() => labsData.value?.labs || [])
const pagination = computed(() => labsData.value?.pagination)

// Filter labs by availability
const filteredLabs = computed(() => {
  let filtered = labs.value

  if (availabilityFilter.value !== 'ALL') {
    filtered = filtered.filter((lab) => lab.availability === availabilityFilter.value)
  }

  return filtered
})

const availabilityOptions = [
  { label: 'All Labs', value: 'ALL' },
  { label: 'Available', value: 'EMPTY' },
  { label: 'Partially Available', value: 'IN_USE' },
  { label: 'Full', value: 'FULL' }
]

const selectedAvailabilityOption = computed({
  get: () =>
    availabilityOptions.find((opt) => opt.value === availabilityFilter.value) ||
    availabilityOptions[0],
  set: (val) => {
    if (val) availabilityFilter.value = val.value as LabAvailability | 'ALL'
  }
})

// Delete confirmation modal
const deleteModalOpen = ref(false)
const labToDelete = ref<number | null>(null)
const deleteLoading = ref(false)

const openDeleteModal = (labId: number) => {
  labToDelete.value = labId
  deleteModalOpen.value = true
}

const deleteLab = async () => {
  if (!labToDelete.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/labs/${labToDelete.value}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Success',
      description: 'Lab deleted successfully',
      color: 'success'
    })

    deleteModalOpen.value = false
    labToDelete.value = null
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Error',
      description:
        (error as { data?: { message?: string } })?.data?.message || 'Failed to delete lab',
      color: 'error'
    })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <UContainer class="py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Labs</h1>
          <p class="text-gray-600 dark:text-gray-400">Browse and manage laboratory spaces</p>
        </div>
        <UButton v-if="canManageLabs" icon="i-heroicons-plus" to="/labs/new"> Add Lab </UButton>
      </div>

      <!-- Filters -->
      <div class="mb-6 flex flex-col sm:flex-row gap-4">
        <USelectMenu
          v-model="selectedAvailabilityOption"
          :options="availabilityOptions"
          placeholder="Filter by availability"
          class="w-full sm:w-64"
        />
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="flex justify-center items-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <!-- Labs Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard
          v-for="lab in filteredLabs"
          :key="lab.id"
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="!canManageLabs && navigateTo(`/labs/${lab.id}`)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-3">
                <LabAvailabilityBadge :availability="lab.availability" size="lg" />
                <span class="text-sm text-gray-600 dark:text-gray-400"> ID: #{{ lab.id }} </span>
              </div>

              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {{ lab.building }} {{ lab.roomNumber }}
              </h3>

              <p
                v-if="lab.description"
                class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2"
              >
                {{ lab.description }}
              </p>

              <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-beaker" class="w-4 h-4" />
                  <span>{{ lab._count?.equipment || 0 }} equipment</span>
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-users" class="w-4 h-4" />
                  <span>Capacity: {{ lab.capacity }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons (Only for Instructors/Admins) -->
          <div v-if="canManageLabs" class="mt-4 flex gap-2">
            <UButton
              variant="outline"
              size="sm"
              icon="i-heroicons-eye"
              :to="`/labs/${lab.id}`"
              @click.stop
            >
              View
            </UButton>
            <UButton
              variant="outline"
              size="sm"
              color="error"
              icon="i-heroicons-trash"
              @click.stop="openDeleteModal(lab.id)"
            >
              Delete
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <div
        v-if="!pending && filteredLabs.length === 0"
        class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <UIcon name="i-heroicons-building-office-2" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-600 dark:text-gray-400 mb-4">No labs found</p>
        <UButton v-if="canManageLabs" icon="i-heroicons-plus" to="/labs/new">
          Add First Lab
        </UButton>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.total_pages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model:page="page"
          :total="pagination.total_results"
          :items-per-page="perPage"
        />
      </div>
    </UContainer>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="deleteModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Confirm Delete</h3>
        </template>

        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete this lab? This action cannot be undone.
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="deleteModalOpen = false"> Cancel </UButton>
            <UButton color="error" :loading="deleteLoading" @click="deleteLab"> Delete </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
