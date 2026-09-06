"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { setTheme } from "@/app/actions/theme";
import { themeAttribute, type Theme } from "@/lib/theme";
import { useState, useTransition } from "react";

const TABS = [
  { href: "/", label: "dashboard" },
  { href: "/questions", label: "questions" },
  { href: "/calendar", label: "calendar" },
  { href: "/groups", label: "groups" },
  { href: "/settings", label: "settings" },
];

/**
 * The pane's own top edge. Navigation lives here rather than in a bar above the pane, so
 * moving between sections reads as the one window reconfiguring, not as browsing pages.
 */
export default function PaneChrome({
  theme,
  signOutAction,
  signedIn,
}: {
  theme: Theme;
  signOutAction: () => Promise<void>;
  signedIn: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5 sm:px-7">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-edge" aria-hidden>
          ⌁
        </span>
        <span className="figure text-[13px] font-bold tracking-[0.18em] text-edge">
          THE SYSTEM
        </span>
      </Link>

      <nav className="flex items-center gap-1 sm:gap-2">
        {(signedIn ? TABS : []).map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative px-2 py-1 font-mono text-[12px] lowercase transition-colors duration-150 ${
                active ? "ink" : "ink-3 hover:opacity-100"
              }`}
            >
              {tab.label}
              {active && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-1 -bottom-0.5 h-px bg-edge edge-glow"
                  aria-hidden
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <ThemeControl initial={theme} />
        {signedIn && (
        <form action={signOutAction}>
          <button
            type="submit"
            title="sign out"
            aria-label="Sign out"
            className="ink-3 p-1 transition-opacity duration-150 hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
        )}
      </div>
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; Icon: typeof Sun; label: string }[] = [
  { value: "SYSTEM", Icon: Monitor, label: "System" },
  { value: "LIGHT", Icon: Sun, label: "Light" },
  { value: "DARK", Icon: Moon, label: "Dark" },
];

function ThemeControl({ initial }: { initial: Theme }) {
  const [theme, setLocal] = useState<Theme>(initial);
  const [, startTransition] = useTransition();

  function choose(next: Theme) {
    setLocal(next);
    const attr = themeAttribute(next);
    if (attr) document.documentElement.setAttribute("data-theme", attr);
    else document.documentElement.removeAttribute("data-theme");
    startTransition(() => {
      void setTheme(next);
    });
  }

  return (
    <div role="radiogroup" aria-label="Color theme" className="flex items-center">
      {THEME_OPTIONS.map(({ value, Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label.toLowerCase()}
            onClick={() => choose(value)}
            className={`p-1 transition-opacity duration-150 ${
              active ? "text-edge" : "ink-3 hover:opacity-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
