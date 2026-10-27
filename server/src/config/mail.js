import nodemailer from 'nodemailer';
import env from './env.js';

let transporter = null;
let etherealAccount = null;

export async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // If SMTP credentials are provided, use Mailtrap
  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
    console.log('Using Mailtrap SMTP');
    return transporter;
  }

  // Fallback to Ethereal test account
  console.log('No SMTP credentials provided, creating Ethereal test account...');
  etherealAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass,
    },
  });
  console.log('Ethereal test account created:', etherealAccount.user);
  return transporter;
}

export function getEtherealPreviewUrl(messageId) {
  if (etherealAccount) {
    return `https://ethereal.email/message/${messageId}`;
  }
  return null;
}

export { etherealAccount };