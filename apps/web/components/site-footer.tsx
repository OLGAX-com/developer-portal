import Link from "next/link";

import { COMMUNITY_LINKS } from "@/lib/community-links";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} Olgax Developer Portal. Open source.</p>
        <div className="flex items-center gap-6">
          <Link href="https://github.com/OLGAX-com" className="hover:text-foreground">
            GitHub
          </Link>
          <Link href={COMMUNITY_LINKS.discord} className="hover:text-foreground">
            Discord
          </Link>
          <Link href={COMMUNITY_LINKS.githubDiscussions} className="hover:text-foreground">
            Discussions
          </Link>
          <Link href={process.env.NEXT_PUBLIC_DOCS_URL ?? "/docs"} className="hover:text-foreground">
            Docs
          </Link>
        </div>
      </div>
    </footer>
  );
}
