import { headers } from "next/headers";
import { Bell } from "lucide-react";

import { auth } from "@olgax/auth";
import { countUnreadNotifications, listNotificationsForUser } from "@olgax/database";
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
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <form action={markAllNotificationsReadAction}>
                <button type="submit" className="text-xs font-normal text-muted-foreground hover:underline">
                  Mark all read
                </button>
              </form>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn("flex flex-col items-start gap-0.5", !notification.readAt && "font-medium")}
            >
              <span className="text-sm">{notification.title}</span>
              {notification.body && <span className="text-xs text-muted-foreground">{notification.body}</span>}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
