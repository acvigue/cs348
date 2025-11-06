<script setup lang="ts">
useHead({
  title: 'Welcome - Your App',
  meta: [{ name: 'description', content: 'Welcome to our amazing application' }]
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <UContainer class="py-16 sm:py-24">
      <div class="text-center">
        <UBadge color="primary" variant="subtle" class="mb-4"> New Features Available </UBadge>

        <h1
          class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl mb-6"
        >
          Welcome to Your App
        </h1>

        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Build amazing applications with modern tools and best practices. Get started today and
          transform your ideas into reality.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UButton size="lg" icon="i-heroicons-rocket-launch" to="/auth/signup">
            Get Started
          </UButton>
          <UButton
            size="lg"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-right"
            to="/about"
          >
            Learn More
          </UButton>
        </div>
      </div>
    </UContainer>

    <!-- Features Section -->
    <UContainer class="py-16">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Why Choose Our Platform?
        </h2>
        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Discover the features that make our platform the perfect choice for your next project.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <UCard>
          <template #header>
            <div
              class="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg mb-4"
            >
              <UIcon
                name="i-heroicons-lightning-bolt"
                class="w-6 h-6 text-primary-600 dark:text-primary-400"
              />
            </div>
          </template>

          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Fast & Reliable</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Built with modern technologies to ensure optimal performance and reliability for your
            applications.
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
            Secure by Default
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Security-first approach with built-in authentication, authorization, and data protection
            features.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <div
              class="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg mb-4"
            >
              <UIcon
                name="i-heroicons-cog-6-tooth"
                class="w-6 h-6 text-primary-600 dark:text-primary-400"
              />
            </div>
          </template>

          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Easy to Customize
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Flexible architecture and comprehensive theming system make customization simple and
            powerful.
          </p>
        </UCard>
      </div>
    </UContainer>

    <!-- CTA Section -->
    <UContainer class="py-16">
      <UCard class="bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800">
        <div class="text-center py-8">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Get Started?
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already building amazing applications with our
            platform.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <UButton size="lg" icon="i-heroicons-user-plus" to="/auth/signup">
              Create Account
            </UButton>
            <UButton
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-phone"
              to="/contact"
            >
              Contact Us
            </UButton>
          </div>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
