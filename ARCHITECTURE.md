# System Architecture

## Frontend
- React Native (Expo)
- Location: `/frontend`
- Consumes REST APIs only
- No business logic related to gambling

### Frontend Structure
```
frontend/
├── App.js              # Navigation & auth flow
├── src/
│   ├── api/           # API service layer (axios)
│   ├── components/    # Reusable UI components
│   ├── context/       # Auth state management
│   └── screens/       # App screens
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Backend
- FastAPI
- Location: `/backend`
- PostgreSQL + PostGIS
- REST-based architecture

### Backend Structure
```
backend/
├── app/
│   ├── api/v1/endpoints/  # API routes
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── utils/             # Helpers & security
│   └── core/              # Config & database
├── alembic/               # Database migrations
```

## Core Services
- Authentication & profiles (email, Google, Apple OAuth)
- Room discovery & geospatial queries (PostGIS)
- Join request workflow with waitlist queue
- Reputation system with reviews
- Location privacy (approximate public locations)

## Data Flow
```
Mobile App → FastAPI → PostgreSQL + PostGIS
     ↓
  SecureStore (JWT tokens)
```

## API Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Email/password login
- `POST /auth/google` - Google OAuth
- `POST /auth/apple` - Apple OAuth
- `POST /auth/logout` - Logout

### Rooms
- `GET /rooms/` - List rooms (with geo filtering)
- `POST /rooms/` - Create room
- `GET /rooms/{id}` - Get room (public)
- `GET /rooms/{id}/private` - Get room (members only)
- `PATCH /rooms/{id}/status` - Update status

### Join Requests & Waitlist
- `POST /join-requests/` - Request to join
- `PUT /join-requests/{id}` - Approve/reject
- `GET /join-requests/rooms/{id}/waitlist` - View waitlist
- `POST /join-requests/rooms/{id}/waitlist/{id}/promote` - Promote
- `DELETE /join-requests/rooms/{id}/waitlist/{id}` - Remove

### Reputation
- `POST /rooms/{id}/reviews` - Submit review
- `GET /users/{id}/reputation` - Get reputation