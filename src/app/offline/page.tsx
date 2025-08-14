export const metadata = {
  title: "Offline | Civic Match",
};

import Image from "next/image";
import RetryButton from "@/components/RetryButton";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <Image src="/icon.png" alt="Civic Match" className="mx-auto mb-6" width={64} height={64} />
        <h1 className="text-2xl font-semibold mb-2">You are offline</h1>
        <p className="text-muted-foreground mb-6">
          Check your connection and try again. Some pages may be available from cache.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}


