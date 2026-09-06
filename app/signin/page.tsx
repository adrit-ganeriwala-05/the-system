import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export const dynamic = "force-dynamic";

export default async function SignInPage({
 searchParams,
}: {
 searchParams: Promise<{ callbackUrl?: string }>;
}) {
 const session = await auth();
 if (session?.user?.id) redirect("/");

 const { callbackUrl } = await searchParams;
 const configured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

 async function signInWithGoogle() {
 "use server";
 await signIn("google", { redirectTo: callbackUrl || "/" });
 }


 return (
 <main className="relative flex flex-1 items-center justify-center p-6">
 <div className="pane w-full max-w-md p-8 text-center">
 <p className="text-xs text-edge">the system</p>
 <h1 className="figure mt-3 text-3xl font-bold ink">Enter the System</h1>
 <p className="mt-3 text-sm ink-2">
 Sign in to begin your ascent from E-Rank to Code Sovereign.
 </p>

 {configured ? (
 <form action={signInWithGoogle} className="mt-8">
 <GoogleSignInButton />
 </form>
 ) : (
 <div className="mt-8 border border-bad bg-transparent p-4 text-left text-sm text-bad">
 <p className="font-semibold">Google OAuth is not configured.</p>
 <p className="mt-1 text-bad">
 Set <code className="font-mono">AUTH_GOOGLE_ID</code> and{" "}
 <code className="font-mono">AUTH_GOOGLE_SECRET</code> in{" "}
 <code className="font-mono">.env</code>, then restart the dev server. See the
 README for Google Cloud Console setup steps.
 </p>
 </div>
 )}
 </div>
 </main>
 );
}
