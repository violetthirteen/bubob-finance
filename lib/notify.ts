export async function ensureNotifPermission() {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export function fireNotif(title: string, body: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body })
}
