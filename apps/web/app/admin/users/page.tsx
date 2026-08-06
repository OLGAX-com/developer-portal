import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@olgax/auth";
import { listAllUsers, type Role } from "@olgax/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateUserRole } from "./actions";

const ROLES: Role[] = ["VISITOR", "CONTRIBUTOR", "MENTOR", "MAINTAINER", "ADMINISTRATOR"];

export default async function UsersAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const users = await listAllUsers();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/admin" className="mb-2 inline-block text-sm text-muted-foreground hover:underline">
        &larr; Admin
      </Link>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Users</h1>
      <p className="mb-8 text-muted-foreground">
        Check who&apos;s a mentor vs. just a contributor, and change roles directly.
      </p>

      <div className="flex flex-col gap-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <Avatar>
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                  {user.profile?.githubUsername && ` · @${user.profile.githubUsername}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ROLES.map((role) =>
                  role === user.role ? (
                    <Badge key={role}>{role}</Badge>
                  ) : (
                    <form key={role} action={updateUserRole.bind(null, user.id, role)}>
                      <Button
                        type="submit"
                        size="xs"
                        variant="outline"
                        disabled={user.id === session?.user.id && role !== "ADMINISTRATOR"}
                      >
                        {role}
                      </Button>
                    </form>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
