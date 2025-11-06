import { hash } from 'bcrypt'
import { z } from 'zod'
import prisma from '../../prisma'

export default defineEventHandler(async (event) => {
  const registerUserSchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(8)
  })

  const body = await readValidatedBody(event, registerUserSchema.parse)

  const user = await prisma.user
    .create({
      data: {
        email: body.email,
        password: await hash(body.password, 12),
        name: body.name
      }
    })
    .catch((err) => {
      if (err.code === 'P2002') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Email already in use'
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'Internal server error'
      })
    })

  await event.context.session.update({
    user_id: user.id
  })

  return {
    status: 201,
    body: {
      id: user.id,
      email: user.email
    }
  }
})
