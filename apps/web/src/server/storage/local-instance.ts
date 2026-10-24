import { getStorage } from "./index";
import { LocalStorageProvider } from "./local-provider";

/** The local provider when it is the configured one; the /api/storage routes are not available otherwise. */
export function getLocalStorage(): LocalStorageProvider | null {
  const storage = getStorage();
  return storage instanceof LocalStorageProvider ? storage : null;
}
