"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme";

/**
 * Writes the cookie first (it's what the server reads on the next first paint) and mirrors
 * it to the account when signed in, so an explicit choice follows the user to a new device.
 */
export async function setTheme(theme: Theme) {
  if (!isTheme(theme)) throw new Error("Unknown theme.");

  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, {
    maxAge: THEME_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { themePreference: theme },
    });
  }
}
