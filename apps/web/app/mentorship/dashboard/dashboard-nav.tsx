"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Inbox, MessageSquare, UserCog, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/mentorship/dashboard/requests", label: "Requests", icon: Inbox },
  { href: "/mentorship/dashboard/active", label: "Active mentorships", icon: Users },
  { href: "/mentorship/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/mentorship/dashboard/certificates", label: "Certificates", icon: Award },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${
              isActive
                ? "bg-navy text-white dark:bg-yellow dark:text-navy"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/mentorship/apply"
        className="mt-2 flex shrink-0 items-center gap-2 rounded-md border border-navy/30 px-3 py-2 text-sm font-medium text-navy hover:bg-navy/5 dark:border-yellow/30 dark:text-yellow dark:hover:bg-yellow/5"
      >
        <UserCog className="size-4" />
        Mentor profile
      </Link>
    </nav>
  );
}
