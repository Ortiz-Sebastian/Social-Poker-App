"""
Geocoding utility for converting addresses to coordinates.
Uses OpenStreetMap's Nominatim service (free, no API key required).
"""
from typing import Optional, Tuple
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import logging

logger = logging.getLogger(__name__)

# Initialize geocoder with a user agent (required by Nominatim)
geolocator = Nominatim(user_agent="pocketpoker_app", timeout=10)


def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Convert an address string to latitude/longitude coordinates.
    
    Args:
        address: Address string (can be full address, city, or zipcode)
    
    Returns:
        Tuple of (latitude, longitude) or None if not found
    
    Examples:
        - "1600 Amphitheatre Parkway, Mountain View, CA"
        - "San Francisco, CA"
        - "90210"
        - "New York City"
    """
    if not address or len(address.strip()) < 2:
        return None
    
    try:
        location = geolocator.geocode(address)
        
        if location:
            logger.info(f"Geocoded '{address}' -> ({location.latitude}, {location.longitude})")
            return (location.latitude, location.longitude)
        else:
            logger.warning(f"Could not geocode address: {address}")
            return None
            
    except GeocoderTimedOut:
        logger.error(f"Geocoding timed out for address: {address}")
        return None
    except GeocoderServiceError as e:
        logger.error(f"Geocoding service error for '{address}': {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected geocoding error for '{address}': {e}")
        return None


def reverse_geocode(latitude: float, longitude: float) -> Optional[str]:
    """
    Convert coordinates to an address string.
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
    
    Returns:
        Address string or None if not found
    """
    try:
        location = geolocator.reverse((latitude, longitude))
        
        if location:
            return location.address
        return None
        
    except Exception as e:
        logger.error(f"Reverse geocoding error for ({latitude}, {longitude}): {e}")
        return None
