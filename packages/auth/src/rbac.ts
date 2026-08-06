import type { Role } from "@olgax/database";

const ROLE_RANK: Record<Role, number> = {
  VISITOR: 0,
  CONTRIBUTOR: 1,
  MENTOR: 2,
  MAINTAINER: 3,
  ADMINISTRATOR: 4,
};

/** Returns true if `userRole` meets or exceeds the `required` role in the hierarchy. */
export function hasRole(userRole: Role, required: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}
