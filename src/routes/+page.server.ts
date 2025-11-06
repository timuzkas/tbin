import db from '$lib/db';
import { env } from '$env/dynamic/private';

export async function load({ getClientAddress }) {
  const clientAddress = getClientAddress();
  const ban = db.prepare('SELECT * FROM bans WHERE ip = ?').get(clientAddress);

  const noLogin = env.LOGIN_ENABLED === 'false';
  const showCredits = env.SHOW_CREDITS === 'TRUE';

  if (ban) {
    return {
      banned: true,
      noLogin,
      showCredits
    };
  }

  return { banned: false, noLogin, showCredits };
}
