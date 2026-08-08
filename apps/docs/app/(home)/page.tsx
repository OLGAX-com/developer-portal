import Link from 'next/link';
import { Card, Cards } from 'fumadocs-ui/components/card';
import {
  BookOpen,
  ExternalLink,
  GitBranch,
  GraduationCap,
  Layers,
  Rocket,
  Trophy,
  UserRound,
  Wrench,
} from 'lucide-react';
import { gitConfig } from '@/lib/shared';

export default function HomePage() {
  const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Olgax Developer Portal Docs</h1>
        <p className="max-w-xl text-fd-muted-foreground">
          How the platform itself is built and organized - setup, architecture, and how each
          module (mentorship, missions, badges, leaderboards, GitHub sync) works.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href={repoUrl}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-fd-accent"
          >
            <ExternalLink className="size-4" />
            View on GitHub
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
        <Cards>
          <Card
            icon={<Rocket />}
            title="Getting Started"
            description="Local setup, environment variables, running the apps"
            href="/docs/getting-started"
          />
          <Card
            icon={<Layers />}
            title="Architecture"
            description="Monorepo layout, tech stack, how data flows"
            href="/docs/architecture"
          />
          <Card
            icon={<Wrench />}
            title="Contributing"
            description="How to propose and land a change"
            href="/docs/contributing"
          />
        </Cards>

        <h2 className="mt-10 mb-3 text-lg font-semibold">Module docs</h2>
        <Cards>
          <Card
            icon={<UserRound />}
            title="Contributor"
            description="Profiles, XP, levels, and contribution history"
            href="/docs/modules/contributor"
          />
          <Card
            icon={<GitBranch />}
            title="Projects"
            description="Tracking repos, issues, and pull requests"
            href="/docs/modules/projects"
          />
          <Card
            icon={<Trophy />}
            title="Missions & Badges"
            description="Data-driven missions and recognition"
            href="/docs/modules/missions-and-badges"
          />
          <Card
            icon={<GraduationCap />}
            title="Mentorship"
            description="Requests, sessions, and graduation"
            href="/docs/modules/mentorship"
          />
          <Card
            icon={<BookOpen />}
            title="Leaderboards & Notifications"
            description="Global, monthly, and repository rankings"
            href="/docs/modules/leaderboards-and-notifications"
          />
          <Card
            icon={<ExternalLink />}
            title="GitHub Integration"
            description="Syncing, webhooks, and rate-limit handling"
            href="/docs/modules/github-integration"
          />
        </Cards>
      </div>
    </div>
  );
}
