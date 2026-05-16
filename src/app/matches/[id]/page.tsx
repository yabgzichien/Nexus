"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function RelationshipDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) router.replace(`/chat/${id}`);
  }, [id, router]);

  return null;
}
