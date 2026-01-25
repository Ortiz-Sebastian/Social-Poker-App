# PostGIS Setup Guide

## ✅ What's Been Configured

Your database is now properly set up for PostGIS geospatial queries:

### 1. **Docker Image** ✅
- Using `postgis/postgis:15-3.3` image which includes PostgreSQL + PostGIS

### 2. **Python Package** ✅
- Added `geoalchemy2==0.14.3` to `requirements.txt`
- This package provides SQLAlchemy support for PostGIS types

### 3. **Database Model** ✅
- Updated `Room` model to use `Geography(geometry_type='POINT', srid=4326)`
- This stores location as a PostGIS Geography point (WGS84 coordinate system)
- Replaced separate `latitude`/`longitude` columns with a single `location` field

### 4. **Alembic Integration** ✅
- Updated `alembic/env.py` to automatically enable PostGIS extension
- Extension is created before migrations run: `CREATE EXTENSION IF NOT EXISTS postgis`
- Added `HostSubscription` model import

### 5. **API Schema** ✅
- Room schemas still accept `latitude`/`longitude` for API convenience
- Backend converts these to PostGIS Geography Point when saving
- Added coordinate validation

## 🔧 How It Works

### Location Storage
- **API Input**: `latitude` and `longitude` as separate fields
- **Database Storage**: Single `location` column as PostGIS Geography Point
- **SRID 4326**: WGS84 coordinate system (standard GPS coordinates)

### Example Usage in Code

When creating a room, you'll need to convert lat/long to PostGIS format:

```python
from geoalchemy2 import WKTElement
from sqlalchemy import func

# Convert lat/long to PostGIS Point
if latitude and longitude:
    point = WKTElement(f'POINT({longitude} {latitude})', srid=4326)
    room.location = point
```

### Geospatial Queries

You can now perform efficient location-based queries:

```python
from sqlalchemy import func
from geoalchemy2 import Geography

# Find rooms within 5km of a point
center_point = func.ST_MakePoint(longitude, latitude)
distance = func.ST_Distance(
    Room.location,
    func.ST_SetSRID(center_point, 4326)::Geography
)

rooms = db.query(Room).filter(
    distance < 5000  # 5000 meters = 5km
).all()
```

## 🚀 Next Steps

1. **Install the new package**:
   ```bash
   pip install -r requirements.txt
   # Or in Docker:
   docker-compose -f docker-compose.dev.yml exec api pip install -r requirements.txt
   ```

2. **Run migrations**:
   ```bash
   alembic revision --autogenerate -m "Add PostGIS location to rooms"
   alembic upgrade head
   ```

3. **Update room creation logic** to convert lat/long to PostGIS Point

## 📝 Important Notes

- **SRID 4326**: This is WGS84, the standard GPS coordinate system
- **Geography vs Geometry**: Using `Geography` type which accounts for Earth's curvature (better for distance calculations)
- **Coordinate Order**: PostGIS uses (longitude, latitude) order, not (lat, long)!
- **Extension**: PostGIS extension is automatically enabled when migrations run

## 🔍 Verifying PostGIS is Working

After running migrations, you can verify:

```sql
-- Check if PostGIS is enabled
SELECT PostGIS_version();

-- Check if extension exists
SELECT * FROM pg_extension WHERE extname = 'postgis';

-- View rooms with location
SELECT id, name, ST_AsText(location) as location FROM rooms;
```

