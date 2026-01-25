from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.host_subscription import SubscriptionStatus, SubscriptionTier


class HostSubscriptionBase(BaseModel):
    tier: SubscriptionTier = SubscriptionTier.BASIC
    expires_at: Optional[datetime] = None
    is_auto_renew: bool = True


class HostSubscriptionCreate(HostSubscriptionBase):
    """Used when creating a subscription (typically from external payment system)"""
    external_subscription_id: Optional[str] = None
    external_customer_id: Optional[str] = None


class HostSubscriptionUpdate(BaseModel):
    status: Optional[SubscriptionStatus] = None
    tier: Optional[SubscriptionTier] = None
    expires_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    is_auto_renew: Optional[bool] = None
    external_subscription_id: Optional[str] = None
    external_customer_id: Optional[str] = None


class HostSubscription(HostSubscriptionBase):
    id: int
    user_id: int
    status: SubscriptionStatus
    started_at: datetime
    cancelled_at: Optional[datetime] = None
    external_subscription_id: Optional[str] = None
    external_customer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

