'use client';

import { LogOut } from 'lucide-react';

export default function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = redirectTo;
  };
  return (
    <button
      type="button"
      onClick={signOut}
      className="ct-btn ct-btn-icon h-10 w-10 border border-line bg-surface"
      title="Sign out"
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
