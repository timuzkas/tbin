import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import db from '$lib/db';
import DOMPurify from 'isomorphic-dompurify';
import { log } from '$lib/log';
import { env } from '$env/dynamic/private';

const MAX_PASTE_SIZE = 1024 * 1024; // 1MB
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 1;
const OFFENSE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1 day
const MAX_OFFENSES = 5;

const noRateLimit = env.RATE_LIMIT_ENABLED === 'false';

export async function POST(event) {
  const clientAddress = event.getClientAddress();

  if (!noRateLimit) {
    // Ban check
    const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);
    if (ban) {
      log(`Banned IP attempted to paste: ${clientAddress}`);
      return new Response('You have been permanently banned for abuse.', { status: 403 });
    }

    // Rate limit check
    const offenses = db
      .prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
      .all(clientAddress, Date.now() - RATE_LIMIT_WINDOW_MS);

    if (offenses.length >= MAX_REQUESTS_PER_WINDOW) {
      db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(
        clientAddress,
        Date.now()
      );
      log(
        `Rate limit exceeded for IP: ${clientAddress}, offenses: ${offenses.length + 1}`
      );

      const allOffenses = db
        .prepare('SELECT * FROM offenses WHERE ip = ? AND timestamp > ?')
        .all(clientAddress, Date.now() - OFFENSE_EXPIRATION_MS);

      if (allOffenses.length > MAX_OFFENSES) {
        db.prepare('INSERT OR IGNORE INTO bans (ip) VALUES (?)').run(clientAddress);
        log(`Banning IP: ${clientAddress}`);
      }

      return new Response('Rate limit exceeded. Please wait before creating another paste.', {
        status: 429
      });
    }
  }

  const { content, language } = await event.request.json();

  if (content.length > MAX_PASTE_SIZE) {
    log(`Paste content too large for IP: ${clientAddress}`);
    return new Response('Paste content is too large.', { status: 413 });
  }

  const sanitizedContent = DOMPurify.sanitize(content);
  if (sanitizedContent !== content) {
    log(`XSS attempt detected and sanitized for IP: ${clientAddress}`);
  }

  const id = randomUUID().slice(0, 8);
  let expires_at = null;
  let user_id = null;

  const authHeader = event.request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
    if (user) {
      user_id = user.id;
    }
  }

  if (!user_id) {
    if (content.length < 500 * 1024) {
      // 1 month for pastes < 0.5 MB
      expires_at = Date.now() + 30 * 24 * 60 * 60 * 1000;
    } else {
      // 1 week for pastes >= 0.5 MB
      expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000;
    }
  }

  db.prepare(
    'INSERT INTO pastes (id, content, language, expires_at, user_id) VALUES (?, ?, ?, ?, ?)'
  ).run(id, sanitizedContent, language || 'plaintext', expires_at, user_id);
  log(`Inserted paste with id: ${id} from IP: ${clientAddress}`);

  if (!noRateLimit) {
    db.prepare('INSERT INTO offenses (ip, timestamp) VALUES (?, ?)').run(
      clientAddress,
      Date.now()
    );
  }

  return json({ id });
}
