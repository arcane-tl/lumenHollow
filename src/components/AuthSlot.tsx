import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-9 w-24 animate-pulse rounded-md bg-fg/10" />;
  }
  if (user) return <UserButton />;
  return (
    <Link
      to="/login"
      className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      Sign in
    </Link>
  );
}
