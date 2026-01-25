# PocketPoker Backend API

FastAPI backend for PocketPoker - a location-based social app for discovering and organizing private poker games.

## Setup

### Option 1: Docker (Recommended)

**Note:** The main Docker Compose files are at the project root. Use those for the full stack setup.

From the project root:
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up --build

# Run database migrations
docker-compose -f docker-compose.dev.yml exec api alembic revision --autogenerate -m "Initial migration"
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

# Stop services
docker-compose -f docker-compose.dev.yml down
```

Or from the backend directory (backend-only setup):
```bash
docker-compose -f docker-compose.dev.yml up --build
```

This will start:
- PostgreSQL with PostGIS extension on port 5432
- FastAPI application on port 8000 (with hot-reload)

Access the API:
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

To stop and remove volumes (clears database):
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Option 2: Local Development

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL with PostGIS extension (or use Docker for just the database):
```bash
docker-compose -f docker-compose.dev.yml up db -d
```

4. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

5. Update `.env` with your database URL and secret key.

6. Initialize Alembic (database migrations):
```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

7. Run the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Application settings
│   │   └── database.py         # Database connection and session
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── room.py
│   │   └── join_request.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── room.py
│   │   └── join_request.py
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── api.py          # API router aggregation
│   │       └── endpoints/      # API endpoints
│   │           ├── __init__.py
│   │           ├── auth.py
│   │           ├── users.py
│   │           ├── rooms.py
│   │           └── join_requests.py
│   └── utils/
│       ├── __init__.py
│       └── security.py         # Password hashing, JWT tokens
├── alembic/                    # Database migrations
├── requirements.txt
├── .env.example
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get access token
- `POST /api/v1/auth/logout` - Logout current user

### Users
- `GET /api/v1/users/me` - Get current authenticated user
- `GET /api/v1/users/{user_id}` - Get user by ID
- `PUT /api/v1/users/me` - Update current user

### Rooms
- `POST /api/v1/rooms/` - Create a new room
- `GET /api/v1/rooms/` - List all active rooms
- `GET /api/v1/rooms/{room_id}` - Get room by ID
- `PUT /api/v1/rooms/{room_id}` - Update room (host only)
- `DELETE /api/v1/rooms/{room_id}` - Delete room (host only)

### Join Requests
- `POST /api/v1/join-requests/` - Create a join request
- `GET /api/v1/join-requests/` - List join requests
- `GET /api/v1/join-requests/{request_id}` - Get join request by ID
- `PUT /api/v1/join-requests/{request_id}` - Update join request status (approve/reject)

## Development Notes

- All endpoints currently return 501 (Not Implemented) - implement business logic as needed
- Authentication dependencies need to be added to protected endpoints
- PostGIS integration for geospatial queries will be added in future updates
- Room chat functionality will be added separately

