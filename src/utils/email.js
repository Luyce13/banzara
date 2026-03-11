const nodemailer = require('nodemailer');
const { ENV, LOG_CONFIG } = require('../constants');
const logger = require('./logger').child({ context: 'Email' });

const transport = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  auth: {
    user: ENV.SMTP_USERNAME,
    pass: ENV.SMTP_PASSWORD,
  },
});

/* istanbul ignore next */
if (ENV.NODE_ENV !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from: ENV.EMAIL_FROM, to, subject, text };
  await transport.sendMail(msg);
};

module.exports = {
  transport,
  sendEmail,
};
