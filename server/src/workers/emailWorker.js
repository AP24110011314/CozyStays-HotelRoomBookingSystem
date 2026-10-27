import { EmailOutbox } from '../models/index.js';
import { getTransporter, getEtherealPreviewUrl } from '../config/mail.js';
import env from '../config/env.js';

const WORKER_ID = `worker-${process.pid}-${Date.now()}`;
const INTERVAL_MS = 15000;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

const BACKOFF_SCHEDULE = [
  1 * 60 * 1000,      // 1 minute
  5 * 60 * 1000,      // 5 minutes
  15 * 60 * 1000,     // 15 minutes
  60 * 60 * 1000,     // 1 hour
  6 * 60 * 60 * 1000, // 6 hours
];

let intervalId = null;

export function startEmailWorker() {
  if (env.nodeEnv === 'test') {
    console.log('Email worker skipped in test environment');
    return;
  }

  console.log('Starting email worker...');
  processQueue(); // Run once on startup
  intervalId = setInterval(processQueue, INTERVAL_MS);
}

export function stopEmailWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Email worker stopped');
  }
}

export async function processQueue() {
  try {
    // 1. Recover stuck emails (status: sending, lockedAt > 10min ago)
    await recoverStuckEmails();

    // 2. Claim and send pending emails
    const email = await claimNextEmail();
    if (email) {
      await sendEmail(email);
    }
  } catch (error) {
    console.error('Error in email worker:', error);
  }
}

export async function recoverStuckEmails() {
  const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
  const result = await EmailOutbox.updateMany(
    {
      status: 'sending',
      lockedAt: { $lt: stuckThreshold },
    },
    {
      $set: {
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Recovered ${result.modifiedCount} stuck email(s)`);
  }
}

export async function claimNextEmail() {
  const now = new Date();

  const email = await EmailOutbox.findOneAndUpdate(
    {
      status: 'pending',
      nextRetryAt: { $lte: now },
      lockedBy: null, // Matches both null AND missing in MongoDB
    },
    {
      $set: {
        status: 'sending',
        lockedAt: now,
        lockedBy: WORKER_ID,
      },
    },
    { new: true }
  );

  return email;
}

async function sendEmail(email) {
  const transporter = await getTransporter();

  try {
    const mailOptions = {
      from: env.smtp.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);

    // Success
    await EmailOutbox.findByIdAndUpdate(email._id, {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });

    // Log Ethereal preview URL if using test account
    if (info.messageId && getEtherealPreviewUrl(info.messageId)) {
      console.log(`Email sent (preview): ${getEtherealPreviewUrl(info.messageId)}`);
    } else {
      console.log(`Email sent to ${email.to}: ${email.subject}`);
    }
  } catch (error) {
    // Failure - handle retry logic
    await handleSendFailure(email, error);
  }
}

async function handleSendFailure(email, error) {
  const newAttempts = email.attempts + 1;
  const maxAttempts = email.maxAttempts || 5;

  if (newAttempts >= maxAttempts) {
    // Max attempts reached - mark as failed
    await EmailOutbox.findByIdAndUpdate(email._id, {
      $set: {
        status: 'failed',
        attempts: newAttempts,
        lastError: error.message,
        lockedAt: null,
        lockedBy: null,
      },
    });
    console.error(`Email failed after ${maxAttempts} attempts: ${email.subject} to ${email.to}`);
  } else {
    // Schedule retry with exponential backoff
    const backoffMs = BACKOFF_SCHEDULE[newAttempts - 1] || BACKOFF_SCHEDULE[BACKOFF_SCHEDULE.length - 1];
    const nextRetryAt = new Date(Date.now() + backoffMs);

    await EmailOutbox.findByIdAndUpdate(email._id, {
      $set: {
        status: 'pending',
        attempts: newAttempts,
        lastError: error.message,
        nextRetryAt,
        lockedAt: null,
        lockedBy: null,
      },
    });

    console.warn(`Email send failed (attempt ${newAttempts}/${maxAttempts}), retrying in ${backoffMs}ms: ${error.message}`);
  }
}

// Retry a specific failed email (admin action)
export async function retryEmail(emailId) {
  const email = await EmailOutbox.findById(emailId);
  if (!email) {
    throw new Error('Email not found');
  }

  await EmailOutbox.findByIdAndUpdate(emailId, {
    $set: {
      status: 'pending',
      attempts: 0,
      lastError: null,
      nextRetryAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });

  return EmailOutbox.findById(emailId);
}