"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HASH_TYPE_ROUTES: Record<string, string> = {
  recovery: "/auth/reset-password",
  invite: "/auth/invite",
};

export function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    if (!type) return;
    const target = HASH_TYPE_ROUTES[type];
    if (target) {
      router.replace(`${target}${window.location.hash}`);
    }
  }, [router]);

  return null;
}
