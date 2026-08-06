# GitHub Copilot Instructions

## Project Overview

This repository contains the **Olgax Community Platform**, a modern open-source community and mentorship platform built around GitHub. This project itself opensource too.

The platform is **not simply a developer portal**.

Its goal is to help students, developers, mentors, and maintainers collaborate on real open-source projects while providing structured learning, mentorship, recognition, and contribution tracking.

Primary objectives include:

- Contributor onboarding
- GitHub integration
- Project management
- Mentorship programs
- Learning paths
- Documentation
- Badges & achievements
- Certificates
- Community events
- Leaderboards

The platform should be designed to support multiple open-source projects within the Olgax ecosystem.

---

# Vision

Build a community where contributors can:

- Learn
- Build
- Collaborate
- Grow
- Mentor others
- Earn recognition

GitHub remains the source of truth for code.

The Olgax platform becomes the source of truth for community.

---

# Core Principles

## Community First

Every feature should encourage collaboration.

Examples:

- discussions
- reviews
- mentorship
- events
- contributor recognition

---

## Developer Experience

Prioritize:

- clean UI
- minimal setup
- reusable components
- excellent documentation

Avoid unnecessary complexity.

---

## Modular Architecture

Everything should be modular.

Prefer feature modules over tightly coupled implementations.

Example:

```
Mentorship Module

Contributor Module

Projects Module

Events Module

Certificates Module

Notifications Module
```

---

## Open Source Friendly

The project should be easy for new contributors.

Always prefer:

- readable code
- predictable architecture
- descriptive naming
- documented APIs

Every feature should be discoverable.

---

# Technology Stack

Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- Next.js Route Handlers
- tRPC (preferred) or REST
- Prisma ORM

Database

- PostgreSQL

Authentication

- Better Auth (preferred) or Auth.js
- GitHub OAuth
- Google OAuth

Infrastructure

- Docker
- Redis (future)
- Background jobs (Trigger.dev / Inngest)

---

# Repository Structure

```
apps/
    web/
    portal/
    docs/
    admin/
    api/

packages/
    ui/
    auth/
    database/
    github/
    mentorship/
    missions/
    certificates/
    notifications/
    analytics/
    shared/

tooling/
```

Keep shared code inside packages.

Never duplicate logic between apps.

---

# Coding Standards

## TypeScript

Use strict typing.

Avoid:

```
any
```

Prefer

```
unknown

interfaces

type aliases

generics
```

---

## React

Prefer

- Server Components
- Functional Components
- Hooks
- Composition

Avoid unnecessary prop drilling.

Use reusable components.

---

## Components

Keep components focused.

Example

Good

```
ContributorCard

BadgeCard

ProjectCard

MissionCard
```

Avoid giant components containing unrelated logic.

---

## Styling

Use Tailwind CSS.

Use shadcn/ui whenever possible.

Avoid inline styles.

---

## Naming

Use descriptive names.

Good

```
ContributorProfile

MentorshipRequest

ProjectOverview

IssueStatistics
```

Avoid

```
Data

Temp

Item

Obj

Utils2
```

---

## Imports

Prefer absolute imports.

Organize imports.

Example

1. React

2. External packages

3. Internal packages

4. Relative imports

---

# Feature Development

Prefer vertical slices.

Example

```
Contributor

components/

hooks/

actions/

types/

services/

schemas/
```

instead of separating everything by technical layer.

---

# API Design

Prefer REST or tRPC endpoints that represent business concepts.

Examples

```
GET /contributors

GET /projects

GET /missions

POST /mentorship/request

POST /badges/award
```

Avoid RPC endpoints like

```
/doAction

/processThing
```

---

# Database Design

Use Prisma.

Every model should have

- id
- createdAt
- updatedAt

Prefer UUIDs.

Use foreign keys.

Avoid duplicated data.

---

# Authentication

Support

- GitHub OAuth
- Google OAuth
- Email (future)

Every authenticated user has one profile.

---

# Authorization

Roles

Visitor

Contributor

Mentor

Maintainer

Administrator

Permissions should be role-based.

Never rely solely on frontend authorization.

---

# Contributor Module

Features include

- GitHub profile
- XP
- Levels
- Badges
- Achievements
- Missions
- Certificates
- Contribution history

---

# Mentorship Module

Features

- Mentor profiles
- Student profiles
- Requests
- Sessions
- Assignments
- Progress tracking
- Feedback
- Graduation

Mentorship should be reusable for multiple cohorts.

---

# Project Module

Every project should include

- Overview
- Documentation
- Maintainers
- Contributors
- Roadmap
- Issues
- Pull Requests
- Releases

GitHub is the source of truth.

A project's Documentation tab is synced and rendered from that project's own GitHub repo (`README.md`, `/docs`), not authored or duplicated inside the platform. Never hand-write a second copy of a project's docs here.

---

# Documentation

Documentation is a first-class feature.

Every major feature should include documentation.

Prefer Markdown.

Two kinds of documentation, handled differently:

- **Platform docs** (how Olgax itself works: contributing guide, module docs, mentorship guide, API reference) live as `.md`/`.mdx` files in `apps/docs`, versioned in this repo and reviewed via PR like any other contribution.
- **Per-project docs** (docs belonging to an individual open-source project in the ecosystem) are never authored here — see Project Module above. They are synced from GitHub so there is one source of truth.

No CMS. Docs-as-code (git + Markdown/MDX) is the standard for both technical docs and the platform's own content. Only consider a database-backed editor later for community-editable content that isn't really "documentation" (e.g. event announcements).

---

# Missions

Support mission types like

- First PR
- Documentation
- Bug Fix
- Testing
- Code Review
- Community Support

Mission logic should be configurable.

Avoid hardcoding.

---

# Badges

Badges should be data-driven.

Example

```
First PR

Top Reviewer

Bug Hunter

Documentation Hero

Community Helper

Mentor

Maintainer
```

---

# Leaderboards

Support

- Global
- Monthly
- Repository
- University
- Cohort

Leaderboard calculations should be reusable.

---

# Certificates

Certificates should include

- contributor name
- certificate id
- QR verification
- issue date
- mentor
- achievements

Generation logic should remain isolated.

---

# GitHub Integration

GitHub is the primary external integration.

Sync

- repositories
- issues
- pull requests
- reviews
- commits
- releases

Do not duplicate GitHub functionality.

Only extend it.

---

# UI Principles

The UI should feel

- modern
- clean
- accessible
- minimal
- developer-focused

Avoid excessive animations.

Prioritize usability.

---

# Performance

Prefer

- Server Components
- Streaming
- Lazy loading
- Pagination

Avoid unnecessary client rendering.

---

# Accessibility

Every feature should support

- keyboard navigation
- screen readers
- semantic HTML
- sufficient contrast

---

# Testing

Prefer

- Unit tests
- Integration tests

Critical business logic should be tested.

---

# Documentation for Contributors

Every feature should include

- overview
- setup
- usage
- examples

Good documentation reduces onboarding time.

---

# AI Assistance Guidelines

When generating code:

- Follow existing architecture.
- Reuse shared packages whenever possible.
- Avoid introducing duplicate abstractions.
- Prefer composition over inheritance.
- Keep functions small and readable.
- Add comments only when the intent is not obvious.
- Suggest improvements when appropriate.
- Preserve consistency with existing patterns.

---

# Long-Term Goal

The Olgax Community Platform should become the central hub for the entire Olgax ecosystem.

It should support:

- multiple repositories
- multiple projects
- multiple universities
- mentorship programs
- contributor recognition
- learning paths
- community events
- open-source collaboration

The platform should scale from a single project to a thriving open-source community without requiring major architectural changes.