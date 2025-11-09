import { createHash } from 'crypto';
import db from './db';

export function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

export function getRateLimits(action: string, userType: string) {
	const specificLimits = db
		.prepare('SELECT * FROM rate_limits WHERE action = ? AND user_type = ?')
		.all(action, userType);

	if (specificLimits.length > 0) {
		return specificLimits;
	}

	const generalUserType = userType === '__GUEST__' ? '__GUEST__' : '__AUTH__';
	const generalLimits = db
		.prepare('SELECT * FROM rate_limits WHERE action = ? AND user_type = ?')
		.all(action, generalUserType);

	return generalLimits;
}

