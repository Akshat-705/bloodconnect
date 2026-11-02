import nodemailer from 'nodemailer'

/**
 * Sends a password reset verification email using Nodemailer with Gmail SMTP.
 */
export async function sendResetCodeEmail(toEmail, code, recipientName = 'Donor') {
  const emailUser = process.env.EMAIL_USER?.trim()
  const emailPass = process.env.EMAIL_PASS?.trim()?.replace(/\s+/g, '') || process.env.EMAIL_PASS?.trim()

  if (!emailUser || !emailPass) {
    console.warn(`\n⚠️  [EMAIL CONFIGURATION REQUIRED]`)
    console.warn(`EMAIL_USER or EMAIL_PASS is not set in server/.env.`)
    console.warn(`🔑 Verification code for ${toEmail}: ${code}`)
    console.warn(`👉 To send real emails to your Gmail inbox, add your Gmail address and App Password to server/.env.\n`)
    return { sent: false, reason: 'unconfigured' }
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  })

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: #dc2626; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">🩸 BloodConnect</h1>
        <p style="color: #fee2e2; margin: 6px 0 0 0; font-size: 14px;">Every Drop Saves a Life</p>
      </div>
      <div style="padding: 32px 24px; color: #1f2937;">
        <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          Hello <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          We received a request to reset your password. Use the verification code below to complete the reset:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #fef2f2; border: 2px dashed #dc2626; color: #dc2626; font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; border-radius: 10px; font-family: monospace;">
            ${code}
          </div>
        </div>
        <p style="font-size: 13px; color: #dc2626; font-weight: 600; text-align: center; margin-bottom: 24px;">
          ⏱️ This code will expire in 15 minutes.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0;">© ${new Date().getFullYear()} BloodConnect. All rights reserved.</p>
      </div>
    </div>
  `

  try {
    const info = await transporter.sendMail({
      from: `"BloodConnect" <${emailUser}>`,
      to: toEmail,
      subject: 'BloodConnect Password Reset Verification Code',
      text: `Your BloodConnect verification code is: ${code}\n\nThis code will expire in 15 minutes.\nIf you did not request a password reset, please ignore this email.`,
      html,
    })
    console.log(`✉️  [EMAIL SENT] Verification code successfully sent to ${toEmail} (Message ID: ${info.messageId})`)
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    console.error(`❌ [EMAIL SEND ERROR] Failed to send email to ${toEmail}:`, err.message)
    throw err
  }
}

/**
 * Sends a warm Welcome Email to new users who register/login to BloodConnect.
 */
export async function sendWelcomeEmail(toEmail, recipientName = 'Donor', donorId = '') {
  const emailUser = process.env.EMAIL_USER?.trim()
  const emailPass = process.env.EMAIL_PASS?.trim()?.replace(/\s+/g, '') || process.env.EMAIL_PASS?.trim()

  if (!emailUser || !emailPass) {
    console.warn(`\n⚠️  [WELCOME EMAIL SKIPPED] EMAIL_USER or EMAIL_PASS not configured in server/.env.\n`)
    return { sent: false, reason: 'unconfigured' }
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  })

  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">🩸 BloodConnect</h1>
        <p style="color: #fee2e2; margin: 8px 0 0 0; font-size: 15px;">Welcome to the Lifesaving Community</p>
      </div>

      <div style="padding: 32px 24px; color: #1f2937;">
        <h2 style="color: #111827; margin-top: 0; font-size: 22px;">Welcome, ${recipientName}! 👋</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          Thank you for joining <strong>BloodConnect</strong>. Your decision to join helps build a dependable network of donors and patients when every second counts.
        </p>

        ${donorId ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 24px 0; text-align: center;">
          <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Your Official Donor ID</div>
          <div style="font-size: 22px; font-family: monospace; font-weight: 700; color: #dc2626; letter-spacing: 1px;">${donorId}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Keep this ID handy when visiting donation centers or checking tracking certificates</div>
        </div>
        ` : ''}

        <h3 style="color: #374151; font-size: 16px; margin-top: 24px; margin-bottom: 12px;">Here is what you can do with your account:</h3>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
          <strong style="color: #991b1b; font-size: 14px;">🩸 Schedule & Register Donations</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #7f1d1d;">Register donations at blood banks, hospitals, and medical camps.</p>
        </div>

        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
          <strong style="color: #1e40af; font-size: 14px;">📍 Real-Time Blood Tracking</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #1e3a8a;">Follow your donated unit through collection, testing, storage, and hospital delivery.</p>
        </div>

        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
          <strong style="color: #166534; font-size: 14px;">🏆 Verified Certificates & Badges</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #14532d;">Download cryptographically verified donation certificates to showcase your lifesaving impact.</p>
        </div>

        <div style="text-align: center; margin: 32px 0 20px 0;">
          <a href="${appUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);">
            Open BloodConnect ➔
          </a>
        </div>
      </div>

      <div style="background: #f9fafb; padding: 18px 24px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0;">You received this email because you signed up for BloodConnect.</p>
        <p style="margin: 4px 0 0 0;">© ${new Date().getFullYear()} BloodConnect. All rights reserved.</p>
      </div>
    </div>
  `

  try {
    const info = await transporter.sendMail({
      from: `"BloodConnect" <${emailUser}>`,
      to: toEmail,
      subject: `Welcome to BloodConnect, ${recipientName}! 🩸`,
      text: `Hello ${recipientName},\n\nWelcome to BloodConnect! Your official Donor ID is: ${donorId}.\n\nVisit BloodConnect at ${appUrl} to track your donations and explore the donor community.\n\nThank you for making a difference!`,
      html,
    })
    console.log(`✉️  [WELCOME EMAIL SENT] Sent welcome email to ${toEmail} (Message ID: ${info.messageId})`)
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    console.error(`❌ [WELCOME EMAIL ERROR] Failed to send welcome email to ${toEmail}:`, err.message)
    return { sent: false, error: err.message }
  }
}
