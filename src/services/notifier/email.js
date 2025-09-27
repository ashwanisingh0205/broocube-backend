// src/services/notifier/email.js
const nodemailer = require('nodemailer');
const config = require('../../config/env');
const logger = require('../../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS
  }
});
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
  logger.info('Email sent', { messageId: info.messageId, to });
  return info;
}
async function sendPasswordResetEmail(to, resetUrl) {
  const mailOptions = {
    from: config.EMAIL_FROM,
    to,
    subject: 'Reset your password',
    html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password. If you did not request this, ignore this email.</p>`
  };
  await transporter.sendMail(mailOptions);
}
module.exports = { sendMail };


