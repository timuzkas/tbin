import db from './db';
import { log } from './log';
import { getRateLimit } from './utils';
import { env } from '$env/dynamic/private';

const noRateLimit = env.NO_RATE_LIMIT === 'true';

export function checkRateLimit(clientAddress: string, userId: string | null, action: string) {
  if (noRateLimit) {
    return null; // No rate limiting applied
  }

  const userTypeForRateLimit = userId ? '__AUTH__' : '__GUEST__';
  const { max_offenses, time_window_seconds } = getRateLimit(action, userTypeForRateLimit);
  const OFFENSE_EXPIRATION_MS = time_window_seconds * 1000;

  const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
  if (ban) {
    log(`Banned IP attempted action ${action}: ${clientAddress}`);
    return new Response('You have been permanently banned for abuse.', { status: 403 });
  }

  const offenses = db
    .prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
    .all(clientAddress, Date.now() - OFFENSE_EXPIRATION_MS);

  if (offenses.length >= max_offenses) {
    db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(
      clientAddress,
      Date.now()
    );
    log(`Rate limit exceeded for IP: ${clientAddress}, action: ${action}, offenses: ${offenses.length + 1}`);

    const allOffenses = db
      .prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
      .all(clientAddress, Date.now() - OFFENSE_EXPIRATION_MS);

    if (allOffenses.length > max_offenses) {
      db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(clientAddress);
      log(`Banning IP: ${clientAddress}`);
    }

    return new Response('Rate limit exceeded. Please wait before performing this action again.', {
      status: 429
    });
  }

  // Record offense for every request to track activity, even if not exceeding limit yet
  db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(clientAddress, Date.now());

  return null; // No rate limit exceeded
}
