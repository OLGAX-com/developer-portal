"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";

export type NavItem = { href: string; label: string };

/** A link is active on its own route and on anything nested under it, so /projects
 * stays highlighted on /projects/[slug]. External hrefs (the docs site can be an
 * absolute URL) never match. */
function isActive(pathname: string, href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors xl:px-2.5 xl:text-sm",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-2 pb-4">
      {items.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <SheetClose
            key={item.href}
            render={<Link href={item.href} />}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </SheetClose>
        );
      })}
    </nav>
  );
}
