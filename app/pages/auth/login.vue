<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth'
})

useHead({
  title: 'Login'
})

const error = ref('')
const loading = ref(false)

// Zod schema for validation
const schema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive<Schema>({
  email: '',
  password: ''
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: event.data.email,
        password: event.data.password
      }
    })

    if (result) {
      await navigateTo('/')
    }
  } catch (err) {
    error.value = (err as { data?: { message?: string } })?.data?.message || 'Failed to login'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="max-w-sm w-full">
    <template #header>
      <div class="text-center">
        <UIcon name="i-heroicons-lock-closed" class="text-primary mx-auto mb-4 size-8" />
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Welcome back!</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?
          <NuxtLink to="/auth/signup" class="text-primary font-medium hover:underline">
            Sign up </NuxtLink
          >.
        </p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" placeholder="Enter your email" required />
      </UFormField>

      <UFormField label="Password" name="password" required>
        <UInput
          v-model="state.password"
          type="password"
          placeholder="Enter your password"
          required
        />
        <ULink
          to="/auth/password-reset"
          class="block mt-1 text-right text-sm text-primary hover:underline"
        >
          Forgot your password?
        </ULink>
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        icon="i-heroicons-information-circle-20-solid"
        :title="error"
        class="mt-4"
      />

      <div class="flex flex-col space-y-3 mt-6">
        <UButton type="submit" block :loading="loading" size="lg">Log In</UButton>

        <UButton
          to="/"
          variant="ghost"
          color="neutral"
          block
          size="md"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <UIcon name="i-heroicons-arrow-left" class="mr-2" />
          Back to Home
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>
