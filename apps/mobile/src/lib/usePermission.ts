import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { notifier } from './notifier';
import type { Permission } from './reminderSync';

/** Whether the phone lets Myto show notifications, re-read when the app comes back to the front (the rider may have changed it in Settings). */
export function usePermission(): { permission: Permission | undefined; refresh: () => void } {
  const [permission, setPermission] = useState<Permission>();
  const refresh = useCallback(() => { void notifier.permission().then(setPermission); }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);
  return { permission, refresh };
}
