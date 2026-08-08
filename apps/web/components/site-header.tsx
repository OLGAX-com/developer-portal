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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/favicon_io-logo-light-bg/android-chrome-192x192.png"
            alt="Olgax"
            width={28}
            height={28}
            className="dark:hidden"
          />
          <Image
            src="/favicon_io-logo-dark-bg/android-chrome-192x192.png"
            alt="Olgax"
            width={28}
            height={28}
            className="hidden dark:block"
          />
          <span>Olgax</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu />

          <Sheet>
            <SheetTrigger
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 px-4 text-sm font-medium">
                {links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
