"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("gc_token");
    router.replace(token ? "/portal" : "/auth");
  }, [router]);
  return null;
}
