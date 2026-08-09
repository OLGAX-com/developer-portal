import Link from "next/link";

import { COMMUNITY_LINKS } from "@/lib/community-links";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} Olgax Developer Portal. Open source.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a
            href="https://github.com/OLGAX-com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={COMMUNITY_LINKS.discord}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Discord
          </a>
          <a
            href={COMMUNITY_LINKS.githubDiscussions}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Discussions
          </a>
          <Link href={process.env.NEXT_PUBLIC_DOCS_URL ?? "/docs"} className="hover:text-foreground">
            Docs
          </Link>
        </div>
      </div>
    </footer>
  );
}
