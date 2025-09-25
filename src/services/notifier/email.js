// src/services/notifier/email.js
const nodemailer = require('nodemailer');
const config = require('../../config/env');
const logger = require('../../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: false,
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

module.exports = { sendMail };


