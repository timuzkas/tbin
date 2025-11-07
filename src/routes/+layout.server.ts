import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/notifications');
  let notifications: { message: string }[] = [];
  if (res.ok) {
    notifications = await res.json();
  }
  return { notifications };
};
