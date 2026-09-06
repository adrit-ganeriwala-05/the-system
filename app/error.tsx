"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 return (
 <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
 <AlertTriangle className="h-10 w-10 text-bad" />
 <div>
 <p className="text-xs text-bad">system error</p>
 <h1 className="mt-2 text-lg font-semibold ink">The System has encountered an anomaly.</h1>
 <p className="mt-1 max-w-md text-sm ink-2">{error.message}</p>
 </div>
 <button
 onClick={reset}
 className=" border border-bad px-4 py-2 text-sm font-medium text-bad hover:bg-transparent"
 >
 Retry
 </button>
 </div>
 );
}
