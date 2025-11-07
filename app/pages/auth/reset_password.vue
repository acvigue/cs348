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
const schema = z
  .object({
    token: z.string(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    verify_password: z.string().min(8, 'Password confirmation is required')
  })
  .refine((data) => data.password === data.verify_password, {
    message: 'Passwords do not match',
    path: ['verify_password']
  })

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  token: '',
  password: '',
  verify_password: ''
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  success.value = ''
  loading.value = true

  // get Token from url params
  const url = new URL(window.location.href)
  const token = url.searchParams.get('token')
  state.token = token || ''

  try {
    const result = await $fetch('/api/auth/reset_password', {
      method: 'POST',
      body: {
        token: state.token,
        password: event.data.password,
        verify_password: event.data.verify_password
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
      (err as { data?: { message?: string } })?.data?.message || 'Failed to reset password'
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
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Set New Password</h1>
      </div>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Password" name="password" required>
        <UInput
          v-model="state.password"
          type="password"
          placeholder="Enter your new password"
          required
        />
      </UFormField>

      <UFormField label="Confirm Password" name="verify_password" required>
        <UInput
          v-model="state.verify_password"
          type="password"
          placeholder="Confirm your new password"
          requiredloc
        />
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
        <UButton type="submit" block :loading="loading" size="lg">Next</UButton>
      </div>
    </UForm>
  </UCard>
</template>
