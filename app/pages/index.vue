<script setup lang="ts">
const { user } = await useUser()

// Redirect logged-in users to dashboard
if (user.value) {
  await navigateTo('/dashboard')
}

useHead({
  title: 'Lab Equipment Reservation System',
  meta: [
    {
      name: 'description',
      content:
        'Reserve and manage lab equipment efficiently with our comprehensive reservation system'
    }
  ]
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <UContainer class="py-16 sm:py-24">
      <div class="text-center">
        <UBadge color="primary" variant="subtle" class="mb-4">
          <UIcon name="i-heroicons-beaker" class="mr-1" />
          Lab Management System
        </UBadge>

        <h1
          class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl mb-6"
        >
          Lab Equipment Reservation System
        </h1>

        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
          Streamline your lab operations with our comprehensive equipment reservation platform. Book
          equipment, manage schedules, and track utilization across multiple laboratory facilities.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UButton size="lg" icon="i-heroicons-user-plus" to="/auth/signup"> Get Started </UButton>
          <UButton
            size="lg"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-right-on-rectangle"
            to="/auth/login"
          >
            Sign In
          </UButton>
        </div>
      </div>
    </UContainer>

    <!-- Features Section -->
    <UContainer class="py-16">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Powerful Lab Management Features
        </h2>
        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Everything you need to efficiently manage lab equipment reservations and track utilization
          across your facilities.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <UCard>
          <template #header>
            <div
              class="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg mb-4"
            >
              <UIcon
                name="i-heroicons-calendar-days"
                class="w-6 h-6 text-primary-600 dark:text-primary-400"
              />
            </div>
          </template>

          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Smart Scheduling</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Intelligent booking system that prevents conflicts and optimizes equipment utilization
            with real-time availability checking.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <div
              class="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg mb-4"
            >
              <UIcon
                name="i-heroicons-chart-bar"
                class="w-6 h-6 text-primary-600 dark:text-primary-400"
              />
            </div>
          </template>

          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Advanced Analytics
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Comprehensive reports on equipment utilization, peak usage hours, and reservation
            patterns to optimize lab operations.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <div
              class="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg mb-4"
            >
              <UIcon
                name="i-heroicons-shield-check"
                class="w-6 h-6 text-primary-600 dark:text-primary-400"
              />
            </div>
          </template>

          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Role-Based Access
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Secure access control with different permission levels for students, instructors, and
            administrators.
          </p>
        </UCard>
      </div>
    </UContainer>

    <!-- CTA Section -->
    <UContainer class="py-16">
      <UCard class="bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800">
        <div class="text-center py-8">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Start Managing Your Lab Today
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join laboratories worldwide that are streamlining their equipment management with our
            comprehensive reservation system.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <UButton size="lg" icon="i-heroicons-user-plus" to="/auth/signup">
              Create Account
            </UButton>
            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-right-on-rectangle"
              to="/auth/login"
            >
              Sign In
            </UButton>
          </div>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
