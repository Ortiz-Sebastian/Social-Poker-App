"""
Location utilities for generating approximate/public locations.
Similar to how Airbnb obscures exact addresses until booking.
"""
import math
import random
from typing import Tuple, Optional


# Constants for location obscuring
MIN_OFFSET_METERS = 200  # Minimum offset from real location
MAX_OFFSET_METERS = 500  # Maximum offset from real location


def generate_random_offset() -> Tuple[float, float]:
    """
    Generate a random offset in meters within MIN_OFFSET to MAX_OFFSET range.
    Returns (offset_x, offset_y) in meters.
    """
    # Random distance between MIN and MAX offset
    distance = random.uniform(MIN_OFFSET_METERS, MAX_OFFSET_METERS)
    
    # Random angle (0 to 2π radians)
    angle = random.uniform(0, 2 * math.pi)
    
    # Convert to x,y offsets
    offset_x = distance * math.cos(angle)
    offset_y = distance * math.sin(angle)
    
    return offset_x, offset_y


def meters_to_degrees_lat(meters: float) -> float:
    """
    Convert meters to degrees latitude.
    1 degree of latitude ≈ 111,320 meters (constant everywhere on Earth)
    """
    return meters / 111320


def meters_to_degrees_lon(meters: float, latitude: float) -> float:
    """
    Convert meters to degrees longitude.
    This varies based on latitude due to Earth's curvature.
    At the equator: 1 degree ≈ 111,320 meters
    At the poles: 1 degree approaches 0 meters
    """
    # Adjust for latitude (cosine of latitude in radians)
    lat_radians = math.radians(latitude)
    meters_per_degree = 111320 * math.cos(lat_radians)
    
    if meters_per_degree == 0:
        return 0
    
    return meters / meters_per_degree


def generate_public_location(
    latitude: float,
    longitude: float
) -> Tuple[float, float]:
    """
    Generate a public/approximate location from exact coordinates.
    
    The public location is randomly offset by 200-500 meters from the real location.
    This protects the host's privacy while still showing the general area.
    
    Args:
        latitude: Exact latitude (-90 to 90)
        longitude: Exact longitude (-180 to 180)
    
    Returns:
        Tuple of (public_latitude, public_longitude)
    """
    # Generate random offset in meters
    offset_x, offset_y = generate_random_offset()
    
    # Convert meter offsets to degree offsets
    lat_offset = meters_to_degrees_lat(offset_y)
    lon_offset = meters_to_degrees_lon(offset_x, latitude)
    
    # Apply offsets
    public_lat = latitude + lat_offset
    public_lon = longitude + lon_offset
    
    # Clamp to valid ranges
    public_lat = max(-90, min(90, public_lat))
    public_lon = max(-180, min(180, public_lon))
    
    return round(public_lat, 6), round(public_lon, 6)


def create_postgis_point_wkt(longitude: float, latitude: float) -> str:
    """
    Create a WKT (Well-Known Text) representation of a point for PostGIS.
    Note: PostGIS uses (longitude, latitude) order.
    
    Args:
        longitude: Longitude coordinate
        latitude: Latitude coordinate
    
    Returns:
        WKT string like 'SRID=4326;POINT(-73.9855 40.758)'
    """
    return f"SRID=4326;POINT({longitude} {latitude})"


def generate_public_location_wkt(
    latitude: float,
    longitude: float
) -> Optional[str]:
    """
    Generate a public location WKT string from exact coordinates.
    
    Args:
        latitude: Exact latitude
        longitude: Exact longitude
    
    Returns:
        WKT string for the public location, or None if coordinates are invalid
    """
    if latitude is None or longitude is None:
        return None
    
    public_lat, public_lon = generate_public_location(latitude, longitude)
    return create_postgis_point_wkt(public_lon, public_lat)
