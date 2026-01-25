"""
Utility functions for checking host permissions and subscription status.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.host_subscription import HostSubscription, SubscriptionStatus


def is_active_host(user: User, db: Session) -> bool:
    """
    Check if a user is an active host with a valid subscription.
    
    A user is considered an active host if:
    1. isHost flag is True
    2. Has an active subscription (status is ACTIVE or TRIAL)
    3. Subscription hasn't expired (if expires_at is set)
    
    Args:
        user: The user to check
        db: Database session
        
    Returns:
        True if user can create rooms, False otherwise
    """
    if not user.isHost:
        return False
    
    # Check if user has an active subscription
    subscription = db.query(HostSubscription).filter(
        HostSubscription.user_id == user.id
    ).first()
    
    if not subscription:
        return False
    
    # Check subscription status
    if subscription.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
        return False
    
    # Check if subscription has expired
    if subscription.expires_at and subscription.expires_at < datetime.utcnow():
        return False
    
    return True


def can_create_room(user: User, db: Session) -> bool:
    """
    Check if a user can create a new room.
    
    This is an alias for is_active_host for clarity in business logic.
    """
    return is_active_host(user, db)

