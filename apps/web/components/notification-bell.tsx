import { headers } from "next/headers";
import { Award, Bell, MessageSquare, Target, type LucideIcon } from "lucide-react";

import { auth } from "@olgax/auth";
import { countUnreadNotifications, listNotificationsForUser } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
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
import { markAllNotificationsReadAction } from "@/app/notifications/actions";

/** Per-type glyph so a row is scannable before you read it. Keyed loosely by the
 * NotificationType enum - unknown values fall back to the bell. */
const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  BADGE_AWARDED: Award,
  MISSION_COMPLETED: Target,
  MENTORSHIP_REQUEST: MessageSquare,
  MENTORSHIP_UPDATE: MessageSquare,
  SYSTEM: Bell,
};

/** Coarse relative time - no need for a date library over a few units. */
function timeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function NotificationBell() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [unreadCount, notifications] = await Promise.all([
    countUnreadNotifications(session.user.id),
    listNotificationsForUser(session.user.id),
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="px-1.5 text-[11px]">
                  {unreadCount} new
                </Badge>
              )}
            </span>
            {unreadCount > 0 && (
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="rounded-md px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Mark all read
                </button>
              </form>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0 my-0" />
        {notifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto overscroll-contain p-1">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md px-2 py-2",
                    unread && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-start gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm leading-snug break-words",
                          unread ? "font-semibold text-foreground" : "font-normal text-muted-foreground",
                        )}
                      >
                        {unread && <span className="sr-only">Unread: </span>}
                        {notification.title}
                      </span>
                      <span className="shrink-0 pt-px text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </span>
                    {notification.body && (
                      <span
                        className={cn(
                          "line-clamp-2 text-xs break-words",
                          unread ? "text-muted-foreground" : "text-muted-foreground/70",
                        )}
                      >
                        {notification.body}
                      </span>
                    )}
                  </span>

                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 size-2 shrink-0 rounded-full",
                      unread ? "bg-primary" : "bg-transparent",
                    )}
                  />
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
