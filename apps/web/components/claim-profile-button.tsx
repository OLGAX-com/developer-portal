"use client";

import { signIn } from "@olgax/auth/client";
import { Button } from "@/components/ui/button";

export function ClaimProfileButton({ callbackURL }: { callbackURL: string }) {
  return (
    <Button size="sm" onClick={() => signIn.social({ provider: "github", callbackURL })}>
      Claim this profile
    </Button>
  );
}
