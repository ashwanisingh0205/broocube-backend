// src/services/notifier/email.js
const nodemailer = require('nodemailer');
const config = require('../../config/env');
const logger = require('../../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    const hasCreds = !!(config.EMAIL_USER && config.EMAIL_PASS);
    const isProd = config.NODE_ENV === 'production';

    if (!hasCreds && !isProd) {
      // Development fallback: log emails instead of sending
      logger.warn('Email credentials missing - using JSON transport (dev fallback)');
      transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      const secure = Number(config.EMAIL_PORT) === 465; // true for port 465
      transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: Number(config.EMAIL_PORT),
        secure,
        auth: hasCreds ? {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS
        } : undefined
      });
    }
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: config.EMAIL_FROM,
    to,
    subject,
    html
  });
  logger.info('Email sent (or logged)', { messageId: info.messageId, to });
  return info;
}
async function sendPasswordResetEmail(to, resetUrl) {
  const t = getTransporter();
  const mailOptions = {
    from: config.EMAIL_FROM,
    to,
    subject: 'Reset your password',
    html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password. If you did not request this, ignore this email.</p>`
  };
  await t.sendMail(mailOptions);
}

async function sendVerificationEmail(to, verifyUrl) {
  const t = getTransporter();
  const mailOptions = {
    from: config.EMAIL_FROM,
    to,
    subject: 'Verify your email address',
    html: `<p>Welcome to Bloocube!</p>
           <p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>
           <p>If you did not create an account, you can ignore this email.</p>`
  };
  await t.sendMail(mailOptions);
}

module.exports = { sendMail, sendPasswordResetEmail, sendVerificationEmail };


