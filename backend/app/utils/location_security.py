"""
Location security utilities to prevent location leakage.

Security measures implemented:
1. Distance fuzzing - adds random noise to distances to prevent triangulation
2. Access logging - logs access to private location data
3. Membership verification helpers
"""
import random
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.room_member import RoomMember, RoomMemberStatus
from app.models.room import Room

# Configure logger for location access auditing
location_audit_logger = logging.getLogger("location_audit")
location_audit_logger.setLevel(logging.INFO)

# Distance fuzzing parameters
# Add ±5-15% random noise to distances to prevent triangulation attacks
DISTANCE_FUZZ_MIN_PERCENT = 0.05  # 5% minimum noise
DISTANCE_FUZZ_MAX_PERCENT = 0.15  # 15% maximum noise


def fuzz_distance(distance_meters: float) -> float:
    """
    Add random noise to distance to prevent triangulation attacks.
    
    Without fuzzing, an attacker could:
    1. Query from multiple known positions
    2. Get exact distances to each position
    3. Use triangulation to pinpoint exact location
    
    By adding ±5-15% random noise, triangulation becomes unreliable.
    
    Args:
        distance_meters: The actual distance in meters
    
    Returns:
        Fuzzed distance with random noise applied
    """
    if distance_meters is None or distance_meters <= 0:
        return distance_meters
    
    # Random noise percentage between ±5% and ±15%
    noise_percent = random.uniform(DISTANCE_FUZZ_MIN_PERCENT, DISTANCE_FUZZ_MAX_PERCENT)
    
    # Randomly add or subtract
    if random.choice([True, False]):
        noise_percent = -noise_percent
    
    fuzzed_distance = distance_meters * (1 + noise_percent)
    
    # Ensure distance is never negative
    return max(0, round(fuzzed_distance, 2))


def log_private_location_access(
    user_id: int,
    room_id: int,
    access_granted: bool,
    reason: str = None
):
    """
    Log access attempts to private location data for security auditing.
    
    This creates an audit trail of who accessed private location data and when.
    Useful for:
    - Detecting suspicious access patterns
    - Compliance and privacy audits
    - Investigating potential data leaks
    
    Args:
        user_id: ID of user attempting access
        room_id: ID of room being accessed
        access_granted: Whether access was granted
        reason: Optional reason for denial or additional context
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "room_id": room_id,
        "access_granted": access_granted,
        "reason": reason
    }
    
    if access_granted:
        location_audit_logger.info(f"PRIVATE_LOCATION_ACCESS: {log_entry}")
    else:
        location_audit_logger.warning(f"PRIVATE_LOCATION_DENIED: {log_entry}")


def verify_room_membership(
    db: Session,
    user_id: int,
    room_id: int
) -> tuple[bool, str]:
    """
    Verify if a user has permission to access private room location.
    
    Returns both the result and the reason for audit logging.
    
    Args:
        db: Database session
        user_id: User ID to check
        room_id: Room ID to check access for
    
    Returns:
        Tuple of (is_authorized, reason)
    """
    # Check if room exists
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return False, "room_not_found"
    
    # Check if room is active
    if not room.is_active:
        return False, "room_inactive"
    
    # Check if user is the host
    if room.host_id == user_id:
        return True, "user_is_host"
    
    # Check if user is an active member
    member = db.query(RoomMember).filter(
        RoomMember.user_id == user_id,
        RoomMember.room_id == room_id,
        RoomMember.status == RoomMemberStatus.ACTIVE
    ).first()
    
    if member:
        return True, "user_is_active_member"
    
    # Check if user was previously a member (for audit purposes)
    past_member = db.query(RoomMember).filter(
        RoomMember.user_id == user_id,
        RoomMember.room_id == room_id
    ).first()
    
    if past_member:
        return False, f"membership_status_{past_member.status.value}"
    
    return False, "not_a_member"


def sanitize_error_message(error: Exception) -> str:
    """
    Sanitize error messages to prevent location data leakage in errors.
    
    Never include coordinates, addresses, or location-related data in error messages.
    
    Args:
        error: The exception that occurred
    
    Returns:
        Safe error message without location data
    """
    # List of patterns that might contain location data
    sensitive_patterns = [
        "latitude", "longitude", "lat", "lon", "lng",
        "coordinates", "location", "address", "point",
        "geography", "geometry", "ST_", "SRID"
    ]
    
    error_str = str(error).lower()
    
    # Check if error might contain sensitive data
    for pattern in sensitive_patterns:
        if pattern in error_str:
            return "An error occurred processing the location request"
    
    return str(error)


# Minimum distance to return (prevents exact location via very small distances)
MIN_DISPLAY_DISTANCE_METERS = 100


def clamp_minimum_distance(distance_meters: float) -> float:
    """
    Ensure returned distances don't get too precise.
    
    Very small distances (< 100m) could help narrow down exact location.
    Clamp to a minimum value.
    
    Args:
        distance_meters: The calculated distance
    
    Returns:
        Distance clamped to minimum value
    """
    if distance_meters is None:
        return None
    
    return max(MIN_DISPLAY_DISTANCE_METERS, distance_meters)
