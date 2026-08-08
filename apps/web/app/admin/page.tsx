import Link from "next/link";
import { GraduationCap, LayoutDashboard, Users } from "lucide-react";

import { prisma } from "@olgax/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHomePage() {
  const [userCount, projectCount, pendingMentorApplications] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.mentorApplication.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mb-8 text-muted-foreground">Platform administration tools.</p>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Users</p>
            <p className="text-2xl font-semibold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Tracked projects</p>
            <p className="text-2xl font-semibold">{projectCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Pending mentor applications</p>
            <p className="text-2xl font-semibold">{pendingMentorApplications}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/mentor-applications">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex-row items-center gap-3">
              <GraduationCap className="size-5 text-navy dark:text-yellow" />
              <div>
                <CardTitle>Mentor Applications</CardTitle>
                <p className="text-sm text-muted-foreground">Review and approve mentor requests</p>
              </div>
              {pendingMentorApplications > 0 && <Badge className="ml-auto">{pendingMentorApplications}</Badge>}
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex-row items-center gap-3">
              <Users className="size-5 text-navy dark:text-yellow" />
              <div>
                <CardTitle>Users</CardTitle>
                <p className="text-sm text-muted-foreground">View everyone and change roles</p>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex-row items-center gap-3">
              <LayoutDashboard className="size-5 text-navy dark:text-yellow" />
              <div>
                <CardTitle>Your Dashboard</CardTitle>
                <p className="text-sm text-muted-foreground">Back to your own contributor dashboard</p>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
