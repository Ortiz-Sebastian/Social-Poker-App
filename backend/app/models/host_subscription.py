from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    TRIAL = "trial"


class SubscriptionTier(str, enum.Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class HostSubscription(Base):
    __tablename__ = "host_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Subscription details
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.TRIAL, nullable=False)
    tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.BASIC, nullable=False)
    
    # Dates
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # None for lifetime subscriptions
    cancelled_at = Column(DateTime, nullable=True)
    
    # External payment system reference (e.g., Stripe subscription ID)
    # The app doesn't process payments, but tracks status from external systems
    external_subscription_id = Column(String, nullable=True, unique=True, index=True)
    external_customer_id = Column(String, nullable=True, index=True)
    
    # Metadata
    is_auto_renew = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="host_subscription", foreign_keys=[user_id])

