import { Loader2 } from "lucide-react";

export default function Loading() {
 return (
 <div className="flex flex-1 flex-col items-center justify-center gap-3 text-edge">
 <Loader2 className="h-8 w-8 animate-spin" />
 <p className="text-xs ">booting…</p>
 </div>
 );
}
