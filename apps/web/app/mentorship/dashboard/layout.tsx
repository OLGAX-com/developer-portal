import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@olgax/auth";
import { DashboardNav } from "./dashboard-nav";

export default async function MentorshipDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/mentorship");

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-2 py-10 sm:px-4 lg:grid-cols-[13rem_1fr]">
      <aside className="min-w-0">
        <div className="lg:sticky lg:top-20">
          <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground uppercase">Your mentorship</h2>
          <DashboardNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

