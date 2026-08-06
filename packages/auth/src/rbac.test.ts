import { describe, expect, it } from "vitest";
import type { Role } from "@olgax/database";
import { hasRole } from "./rbac";

describe("hasRole", () => {
  it("allows a user whose role exactly matches the requirement", () => {
    expect(hasRole("MENTOR", "MENTOR")).toBe(true);
  });

  it("allows a higher-ranked role to satisfy a lower requirement", () => {
    expect(hasRole("ADMINISTRATOR", "CONTRIBUTOR")).toBe(true);
    expect(hasRole("MAINTAINER", "VISITOR")).toBe(true);
  });

  it("rejects a lower-ranked role", () => {
    expect(hasRole("VISITOR", "CONTRIBUTOR")).toBe(false);
    expect(hasRole("CONTRIBUTOR", "MAINTAINER")).toBe(false);
  });

  it("orders every role correctly", () => {
    const ascending: Role[] = ["VISITOR", "CONTRIBUTOR", "MENTOR", "MAINTAINER", "ADMINISTRATOR"];
    for (let i = 0; i < ascending.length; i++) {
      for (let j = 0; j < ascending.length; j++) {
        expect(hasRole(ascending[i], ascending[j])).toBe(i >= j);
      }
    }
  });
});
