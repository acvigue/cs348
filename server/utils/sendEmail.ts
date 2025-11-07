import nodemailer from 'nodemailer'
import { useRuntimeConfig } from '#imports'

export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string
  subject: string
  html: string
}) {
  console.log('Sending email to:', to)
  console.log('Email subject:', subject)
  console.log('Email HTML content:', html)
  return

  const config = useRuntimeConfig()
  const transporter = nodemailer.createTransport({
    host: config.mail.hostname,
    port: Number(config.mail.port),
    secure: Number(config.mail.port) === 465,
    auth: {
      user: config.mail.username,
      pass: config.mail.password
    }
  })

  await transporter.sendMail({
    from: config.mail.username,
    to,
    subject,
    html
  })
}
