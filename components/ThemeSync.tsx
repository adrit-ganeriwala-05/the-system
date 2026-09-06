"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";

/**
 * Carries an explicitly-chosen theme to a device that has never seen it — signing in on a
 * new browser, say.
 *
 * Gated on the *absence* of a cookie, not on the two values differing. A cookie only
 * exists because someone used the toggle on this device, so it represents a deliberate
 * local choice and outranks whatever the account happens to hold; adopting the account
 * value unconditionally would reset that choice on every page load (the account default is
 * SYSTEM, so a local pick of Dark would be wiped the moment the dashboard rendered).
 * Explicit toggles write both the cookie and the account, so the account stays current.
 */
export default function ThemeSync({
  hasCookie,
  dbTheme,
}: {
  hasCookie: boolean;
  dbTheme?: Theme;
}) {
  const router = useRouter();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || hasCookie) return;
    if (!dbTheme || dbTheme === "SYSTEM") return;
    synced.current = true;
    void setTheme(dbTheme).then(() => router.refresh());
  }, [hasCookie, dbTheme, router]);

  return null;
}
