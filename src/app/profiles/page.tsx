"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /profiles redirects to:
 * - /profiles/[userId] if ?user= param is present
 * - /discover otherwise
 */
function ProfilesRedirectContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const userId = params.get("user");
    if (userId) {
      // Redirect to individual profile page
      router.replace(`/profiles/${userId}`);
    } else {
      // Redirect to discover page
      router.replace("/discover");
    }
  }, [params, router]);

  return null;
}

export default function ProfilesRedirect() {
  return (
    <Suspense fallback={null}>
      <ProfilesRedirectContent />
    </Suspense>
  );
}
