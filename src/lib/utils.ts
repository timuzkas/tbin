import { createHash } from 'crypto';
import db from './db';

export function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

export function getRateLimit(action: string, userId: string | null = null) {
  let limit;

  // 1. Try to find a limit for a specific user ID
  if (userId && userId !== '__GUEST__' && userId !== '__AUTH__') {
    limit = db.prepare(
      'SELECT max_offenses, time_window_seconds FROM rate_limits WHERE action = ? AND user_id = ?'
    ).get(action, userId);
    if (limit) return limit;
  }

  // 2. Try to find a limit for authenticated users (if userId is not null and not a special guest/auth string)
  if (userId && userId !== '__GUEST__') {
    limit = db.prepare(
      `SELECT max_offenses, time_window_seconds FROM rate_limits WHERE action = ? AND user_id = '__AUTH__'`
    ).get(action);
    if (limit) return limit;
  }

  // 3. Try to find a limit for unauthenticated users (if userId is null or explicitly '__GUEST__')
  if (!userId || userId === '__GUEST__') {
    limit = db.prepare(
      `SELECT max_offenses, time_window_seconds FROM rate_limits WHERE action = ? AND user_id = '__GUEST__'`
    ).get(action);
    if (limit) return limit;
  }

  // 4. Fallback to global limit (user_id IS NULL)
  limit = db.prepare(
    'SELECT max_offenses, time_window_seconds FROM rate_limits WHERE action = ? AND user_id IS NULL'
  ).get(action);
  if (limit) return limit;

  // 5. Default limits if no configuration is found
  switch (action) {
    case 'paste_creation':
      return { max_offenses: userId ? 5 : 2, time_window_seconds: 3600 }; // Stricter for guests
    case 'file_upload':
      return { max_offenses: userId ? 5 : 1, time_window_seconds: 3600 }; // Stricter for guests
    case 'collection_creation':
        return { max_offenses: userId ? 5 : 2, time_window_seconds: 3600 }; // Stricter for guests
    case 'login_attempt':
      return { max_offenses: 5, time_window_seconds: 600 };
    case 'otp_generation':
      return { max_offenses: 3, time_window_seconds: 300 };
    case 'api_request':
      return { max_offenses: userId ? 100 : 20, time_window_seconds: 60 }; // Stricter for guests
    default:
      return { max_offenses: userId ? 5 : 2, time_window_seconds: 3600 }; // Stricter for guests
  }
}
