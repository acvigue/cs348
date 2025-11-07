import type { User } from '~/generated/prisma/client'
import prisma from '../prisma'

declare module 'h3' {
  interface H3EventContext {
    session: Awaited<ReturnType<typeof useSession>>
    user: User | null
  }
}

export default defineEventHandler(async (event) => {
  const session = await useSession(event, {
    password: useRuntimeConfig().auth.secret,
    name: 'my-session',
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    },
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
  event.context.session = session

  if (event.context.session.data?.user_id) {
    const user = await prisma.user.findUnique({ where: { id: event.context.session.data.user_id } })
    if (!user) {
      delete event.context.session.data?.user_id
      return
    }
    event.context.user = user
  }
})

export function isAdmin(user: User): boolean {
  return user.role === 'ADMIN'
}

export function isInstructorOrAdmin(user: User): boolean {
  return user.role === 'ADMIN' || user.role === 'INSTRUCTOR'
}
