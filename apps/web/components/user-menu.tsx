"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import { signIn, signOut, useSession } from "@olgax/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn.social({ provider: "github", callbackURL: "/" })}
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Sign in with GitHub
      </button>
    );
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}
      >
        <Avatar>
          <AvatarImage src={user.image ?? undefined} alt={user.name} />
          <AvatarFallback>
            <UserRound className="size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 overflow-hidden">
            <span className="truncate text-sm font-medium text-foreground" title={user.name}>
              {user.name}
            </span>
            <span
              className="truncate text-xs font-normal text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
