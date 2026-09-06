import Pane from "./system/Pane";
import PaneChrome from "./system/PaneChrome";
import { PaneMotionProvider } from "./system/PaneMotionContext";
import { auth, signOut } from "@/auth";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { cookies } from "next/headers";

/**
 * Wraps every signed-in surface in the one pane. Navigation swaps what the pane shows
 * rather than moving between separately-chromed pages.
 */
export default async function SystemShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  // Fluid: the pane takes the real estate it is given rather than floating in a fixed
  // box. The cap only stops it becoming unreadably wide on an ultrawide display.
  return (
    <div className="mx-auto flex w-full max-w-[2200px] flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <PaneMotionProvider>
        <Pane>
          <PaneChrome theme={theme} signOutAction={doSignOut} signedIn={Boolean(session?.user)} />
          <div className="rule h-px" />
          {children}
        </Pane>
      </PaneMotionProvider>
    </div>
  );
}
