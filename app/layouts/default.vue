<script setup lang="ts">
const { user, loggedIn } = await useUser()

const links = [
  {
    label: 'Dashboard',
    icon: 'i-heroicons-home',
    to: '/dashboard'
  },
  {
    label: 'Equipment',
    icon: 'i-heroicons-beaker',
    to: '/equipment'
  },
  {
    label: 'Labs',
    icon: 'i-heroicons-building-office-2',
    to: '/labs'
  },
  {
    label: 'Reservations',
    icon: 'i-heroicons-calendar-days',
    to: '/reservations'
  }
]

const isInstructorOrAdmin = computed(
  () => user.value?.body?.role === 'INSTRUCTOR' || user.value?.body?.role === 'ADMIN'
)

if (isInstructorOrAdmin.value) {
  links.push({
    label: 'Reports',
    icon: 'i-heroicons-chart-bar',
    to: '/reports'
  })
}

if (loggedIn) {
  links.push({
    label: 'Logout',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    to: '/auth/logout'
  })
}

const siteName = useAppConfig().public.siteName
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NuxtLoadingIndicator />
    <UHeader :title="siteName">
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors"
        >
          <UIcon name="i-heroicons-beaker" class="w-6 h-6" />
          {{ siteName }}
        </NuxtLink>
      </template>
      <template #right>
        <UNavigationMenu :items="links" />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>
  </div>
</template>
