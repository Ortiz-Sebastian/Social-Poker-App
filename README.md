# PocketPoker — Social Poker Game Discovery Platform

PocketPoker is a location-based social app that helps players discover, host, and join private poker games safely and responsibly — without handling money or facilitating gambling.

The app focuses on coordination, trust, and reputation, solving the real problems around organizing home poker games: finding players, setting expectations, and ensuring reliability.

## Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Start all services (database + API)
docker-compose -f docker-compose.dev.yml up --build

# Run database migrations (in another terminal)
docker-compose -f docker-compose.dev.yml exec api alembic revision --autogenerate -m "Initial migration"
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

# Stop services
docker-compose -f docker-compose.dev.yml down
```

The API will be available at:
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

For more detailed setup instructions, see the [backend README](./backend/README.md).

🚀 Why PocketPoker Exists

Organizing private poker games today is messy:

Generic meetup apps lack trust and filtering

Group chats don’t scale

Hosts struggle with no-shows, mismatched skill levels, and safety concerns

PocketPoker provides poker-specific tooling:

Reputation-based discovery

Host-controlled rooms

Location-aware search

Private, approval-based access

PocketPoker does not run games, process payments, or handle wagers.
It is a social coordination platform, not a gambling platform.

✨ Core Features (MVP)
🧑‍🤝‍🧑 Player Profiles

Poker-specific user profiles

Reputation score based on past games

Games hosted / games joined

Reliability and behavior feedback

🏠 Host-Created Rooms

Hosts can create private poker rooms with:

Game type (e.g. Texas Hold’em)

Skill level (Beginner / Intermediate / Advanced)

Expected buy-in (informational only)

Max players

Date & time

Location (hidden until approval)

House rules / description

Hosts have full control:

Approve or deny join requests

Remove players

Lock or cancel games

📍 Location-Based Discovery

Find poker games nearby using geospatial queries

Filter by skill level, availability, and open seats

Addresses remain private until host approval

💬 Room Messaging

Lightweight group chat per room

Used for coordination, updates, and communication

No direct messaging (by design, for safety)

⭐ Reputation System

Players and hosts rate each other after a game ends

Reputation affects discoverability and trust

Prevents bad actors and repeat no-shows

⚖️ Legal & Safety Design

PocketPoker is designed intentionally to avoid gambling facilitation:

❌ No in-app payments

❌ No escrow or deposits

❌ No winnings tracking

❌ No rake or fees tied to games

❌ No enforcement of buy-ins

Buy-ins are displayed for informational purposes only and handled entirely outside the app.

Age Requirement

Users must confirm they are 21+

No ID verification in MVP

🛠️ Tech Stack
Mobile

React Native (Expo)

NativeWind / Tailwind-style UI

Expo Push Notifications

Backend

FastAPI (Python)

PostgreSQL + PostGIS (geospatial queries)

SQLAlchemy / SQLModel

Auth & Realtime

Clerk or Firebase Auth

Supabase Realtime or WebSockets (room chat)

Infrastructure

Backend: Render / Fly.io

Database: Supabase Postgres

Storage: Supabase Storage or S3

🗂️ High-Level Architecture
Mobile App (React Native)
        |
        v
REST API (FastAPI)
        |
        v
PostgreSQL + PostGIS


Core services:

Authentication & user profiles

Room discovery & geospatial queries

Join request workflow

Reputation & reviews

Realtime room messaging

📦 Core Data Models (Simplified)

User

Room

JoinRequest

RoomMember

Message

Review

Rooms store location data using GEOGRAPHY(Point, 4326) to enable efficient nearby searches.

🧭 Roadmap (Post-MVP)

Verified host badges

Recurring games / trusted circles

Private clubs

Host subscriptions

Enhanced moderation & reporting

Static map previews

Real-money handling is intentionally out of scope unless legal, regulatory, and licensing requirements are met.

🧠 Design Philosophy

Trust > Scale

Host control > Open access

Safety > Growth hacks

Information ≠ Facilitation

PocketPoker is optimized for quality games, not maximum exposure.

📄 Disclaimer

PocketPoker does not organize, operate, or facilitate gambling.
All games are privately hosted by users, who are solely responsible for complying with local laws and regulations.

👋 About the Project

This project is built as a full-stack MVP to explore:

Geospatial discovery

Trust-based marketplaces

Mobile + backend system design

Legal-aware product engineering