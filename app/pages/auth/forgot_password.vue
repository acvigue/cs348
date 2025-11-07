<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth'
})

useHead({
  title: 'Forgot Password'
})

const error = ref('')
const success = ref('')
const loading = ref(false)

// Zod schema for validation
const schema = z.object({
  email: z.email('Invalid email address')
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  email: ''
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const result = await $fetch('/api/auth/forgot_password', {
      method: 'POST',
      body: {
        email: event.data.email
      }
    })

    if (result) {
      success.value = result.body.message
      setTimeout(() => {
        navigateTo('/auth/login')
      }, 2000)
    }
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message || 'Failed to send reset email'
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
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Forgot Password</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Remembered your password?
          <NuxtLink to="/auth/login" class="text-primary font-medium hover:underline">
            Back to login </NuxtLink
          >.
        </p>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" placeholder="Enter your email" required />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        icon="i-heroicons-information-circle-20-solid"
        :title="error"
        class="mt-4"
      />

      <UAlert
        v-if="success"
        color="success"
        icon="i-heroicons-check-circle-20-solid"
        :title="success"
        class="mt-4"
      />

      <div class="flex flex-col space-y-3 mt-6">
        <UButton type="submit" block :loading="loading" size="lg">Continue</UButton>

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
