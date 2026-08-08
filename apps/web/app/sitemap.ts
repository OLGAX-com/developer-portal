import type { MetadataRoute } from "next";
import { prisma } from "@olgax/database";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projects = await prisma.project.findMany({ select: { slug: true, updatedAt: true } });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/projects`, changeFrequency: "daily", priority: 0.9 },
    { url: `${appUrl}/mentorship`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${appUrl}/missions`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${appUrl}/programs`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${appUrl}/leaderboard`, changeFrequency: "daily", priority: 0.6 },
  ];

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${appUrl}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}
