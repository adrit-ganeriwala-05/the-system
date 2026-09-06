import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Rajdhani, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import SystemShell from "@/components/SystemShell";
import ThemeSync from "@/components/ThemeSync";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTheme, parseTheme, THEME_COOKIE, themeAttribute } from "@/lib/theme";

// Display: headings and card titles. Rajdhani ships fixed weights, not a variable axis.
const rajdhani = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Body copy.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

// Stat readouts: Level, EXP, timers, Rank letter.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Reserved for high-drama moments only — the landing hero and the level-up modal.
const orbitron = Orbitron({
  variable: "--font-hero",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The System",
  description: "Level up from E-Rank to Code Sovereign.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read the preference on the server so <html> is stamped before first paint. A
  // client-side useState would apply the theme only after hydration, which flashes.
  const jar = await cookies();
  const cookieValue = jar.get(THEME_COOKIE)?.value;
  const cookieTheme = parseTheme(cookieValue);
  const hasCookie = isTheme(cookieValue);

  // The account-level preference follows the user to a new device. The cookie still wins
  // this paint; ThemeSync reconciles afterwards if they disagree.
  const session = await auth();
  const dbTheme = session?.user?.id
    ? (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { themePreference: true },
        })
      )?.themePreference
    : undefined;

  const attr = themeAttribute(cookieTheme);

  return (
    <html
      lang="en"
      data-theme={attr}
      suppressHydrationWarning
      className={`${rajdhani.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeSync hasCookie={hasCookie} dbTheme={dbTheme} />
        <SystemShell>{children}</SystemShell>
      </body>
    </html>
  );
}
