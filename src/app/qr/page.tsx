"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function QRPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return null;
}
