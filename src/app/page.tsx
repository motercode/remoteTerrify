"use client";

import dynamic from "next/dynamic";

// Todo depende de APIs del navegador (sensores, IndexedDB, localStorage): sin SSR.
const Dashboard = dynamic(
  () => import("@/components/dashboard/Dashboard").then((m) => m.Dashboard),
  { ssr: false },
);

export default function Home() {
  return <Dashboard />;
}
