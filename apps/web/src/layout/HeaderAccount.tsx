import { AccountMenu } from "@/features/account/AccountMenu";
import { getCurrentUser } from "@/server/auth/session";

/** Reads the session cookie, so it must be rendered inside a Suspense boundary. */
export async function HeaderAccount() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // If the database is unreachable the page still renders for signed-out visitors.
  }
  return <AccountMenu user={user ? { displayName: user.displayName, email: user.email } : null} />;
}
