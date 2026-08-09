import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { Menu } from "lucide-react";

import { auth, hasRole } from "@olgax/auth";
import { prisma } from "@olgax/database";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";
import { MainNav, MobileNav } from "@/components/site-nav";

const navLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Task Board" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/missions", label: "Missions" },
  { href: "/programs", label: "Programs" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: process.env.NEXT_PUBLIC_DOCS_URL ?? "/docs", label: "Docs" },
];

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
  const isAdministrator = Boolean(user && hasRole(user.role, "ADMINISTRATOR"));

  const links = session
    ? [
        { href: "/dashboard", label: "Dashboard" },
        ...navLinks,
        ...(isAdministrator ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : navLinks;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:gap-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
        >
          <Image
            src="/favicon_io-logo-light-bg/android-chrome-192x192.png"
            alt="Olgax Developer Portal"
            width={28}
            height={28}
            className="dark:hidden"
          />
          <Image
            src="/favicon_io-logo-dark-bg/android-chrome-192x192.png"
            alt="Olgax Developer Portal"
            width={28}
            height={28}
            className="hidden dark:block"
          />
          <span>Olgax</span>
        </Link>

        <MainNav items={links} />

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu />

          <Sheet>
            <SheetTrigger
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <MobileNav items={links} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
