# System Architecture

## Frontend
- React Native (Expo)
- Consumes REST APIs only
- No business logic related to gambling

## Backend
- FastAPI
- PostgreSQL + PostGIS
- REST-based architecture

## Core services
- Authentication & profiles
- Room discovery & geospatial queries
- Join request workflow
- Reputation system
- Realtime room chat

## Data flow
Mobile App → FastAPI → PostgreSQL