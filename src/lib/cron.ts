import db from './db';
import { log } from './log';
import fs from 'node:fs/promises'; // For file deletion

export function purgeExpiredPastes() {
  const now = Date.now();
  const result = db.prepare('DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
  log(`Deleted ${result.changes} expired pastes.`);
  return result.changes;
}

export function purgeInactiveAccounts() {
  const twoYearsAgo = Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60); // 2 years in seconds
  const result = db.prepare('DELETE FROM users WHERE last_login_at < ?').run(twoYearsAgo);
  log(`Deleted ${result.changes} inactive accounts.`);
  return result.changes;
}

export function purgeOldIpOffenses() {
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60); // 7 days in seconds
  const result = db.prepare('DELETE FROM offenses WHERE timestamp < ? AND expires_at IS NULL').run(sevenDaysAgo);
  log(`Deleted ${result.changes} old IP offenses.`);
  return result.changes;
}

export function purgeExpiredNotifications() {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
  log(`Deleted ${result.changes} expired notifications.`);
  return result.changes;
}

export function purgeExpiredFileCollections() {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM file_collections WHERE expires_at IS NOT NULL AND expires_at < ?').run(now);
  log(`Deleted ${result.changes} expired file collections.`);
  return result.changes;
}

export async function purgeExpiredFiles() {
  const now = Math.floor(Date.now() / 1000);
  const expiredFiles = db.prepare('SELECT id FROM files WHERE expires_at IS NOT NULL AND expires_at < ?').all(now);
  let deletedCount = 0;

  for (const file of expiredFiles) {
    try {
      await fs.unlink(`./uploads/${file.id}`); // Assuming files are stored in ./uploads/
      db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
      deletedCount++;
    } catch (error) {
      log(`Error deleting file ${file.id}: ${error.message}`);
    }
  }
  log(`Deleted ${deletedCount} expired files.`);
  return deletedCount;
}

export function purgeExpiredPendingOtp() {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM pending_otp WHERE expires_at < ?').run(now);
  log(`Deleted ${result.changes} expired pending OTP entries.`);
  return result.changes;
}

export function purgeOldFailedOtpAttempts() {
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600; // 1 hour in seconds
  const result = db.prepare('DELETE FROM failed_otp_attempts WHERE timestamp < ?').run(oneHourAgo);
  log(`Deleted ${result.changes} old failed OTP attempts.`);
  return result.changes;
}

export async function runAllPurges() {
  log('Running all purge operations...');
  purgeExpiredPastes();
  purgeInactiveAccounts();
  purgeOldIpOffenses();
  purgeExpiredNotifications();
  purgeExpiredFileCollections();
  await purgeExpiredFiles(); // Await this as it's async
  purgeExpiredPendingOtp();
  purgeOldFailedOtpAttempts();
  log('All purge operations completed.');
}