"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export default function GoogleSignInButton() {
 const { pending } = useFormStatus();

 return (
 <button
 type="submit"
 disabled={pending}
 className="flex w-full items-center justify-center gap-3 border border-edge bg-transparent px-4 py-3 text-sm font-semibold text-edge transition-colors hover:bg-transparent disabled:opacity-50"
 >
 {pending ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
 <path
 fill="currentColor"
 d="M12.24 10.29v3.62h5.09a4.36 4.36 0 0 1-1.9 2.86v2.37h3.07c1.8-1.66 2.83-4.1 2.83-7a8.6 8.6 0 0 0-.14-1.55z"
 />
 <path
 fill="currentColor"
 d="M12.24 21c2.56 0 4.71-.85 6.28-2.3l-3.07-2.37c-.85.57-1.94.91-3.21.91-2.47 0-4.56-1.67-5.31-3.91H3.75v2.45A9.48 9.48 0 0 0 12.24 21"
 />
 <path
 fill="currentColor"
 d="M6.93 13.33a5.7 5.7 0 0 1 0-3.63V7.25H3.75a9.49 9.49 0 0 0 0 8.53z"
 />
 <path
 fill="currentColor"
 d="M12.24 5.79c1.39 0 2.64.48 3.63 1.42l2.72-2.72C16.94 2.98 14.8 2.03 12.24 2.03A9.48 9.48 0 0 0 3.75 7.25L6.93 9.7c.75-2.24 2.84-3.91 5.31-3.91"
 />
 </svg>
 )}
 Continue with Google
 </button>
 );
}
