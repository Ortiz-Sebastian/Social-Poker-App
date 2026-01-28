from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.user import User as UserModel
from app.schemas.user import (
    UserCreate, User, EmailLogin, GoogleSignIn, AppleSignIn, TokenResponse
)
from app.utils.security import (
    verify_password, get_password_hash, create_access_token,
    verify_google_token, verify_apple_token
)
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    # Check if email or username already exists
    existing_user = db.query(UserModel).filter(
        or_(UserModel.email == user_data.email, UserModel.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    # Validate password is provided for email registration
    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for email registration"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = UserModel(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        age=user_data.age,
        provider='email',
        is_active=True,
        is_verified=False
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=User.model_validate(db_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: EmailLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    # Find user by email
    user = db.query(UserModel).filter(UserModel.email == credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user has a password (not OAuth-only user)
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses OAuth sign-in. Please use Google or Apple sign-in."
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=User.model_validate(user)
    )


@router.post("/google", response_model=TokenResponse)
async def google_signin(google_data: GoogleSignIn, db: Session = Depends(get_db)):
    """Sign in or register with Google"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured"
        )
    
    # Verify Google token
    try:
        google_user_info = verify_google_token(google_data.id_token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to verify Google token: {str(e)}"
        )
    
    email = google_user_info.get('email')
    provider_id = google_user_info.get('provider_id')
    full_name = google_user_info.get('full_name')
    
    if not email or not provider_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google token: missing email or user ID"
        )
    
    # Check if user exists by email or provider_id
    user = db.query(UserModel).filter(
        or_(
            UserModel.email == email,
            UserModel.provider_id == provider_id
        )
    ).first()
    
    if user:
        # Update provider info if needed
        if user.provider != 'google' or user.provider_id != provider_id:
            user.provider = 'google'
            user.provider_id = provider_id
            if full_name and not user.full_name:
                user.full_name = full_name
            db.commit()
            db.refresh(user)
    else:
        # Create new user
        # Generate username from email if not provided
        username_base = email.split('@')[0]
        username = username_base
        counter = 1
        while db.query(UserModel).filter(UserModel.username == username).first():
            username = f"{username_base}{counter}"
            counter += 1
        
        user = UserModel(
            email=email,
            username=username,
            hashed_password=None,
            full_name=full_name,
            provider='google',
            provider_id=provider_id,
            is_active=True,
            is_verified=google_user_info.get('email_verified', False)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=User.model_validate(user)
    )


@router.post("/apple", response_model=TokenResponse)
async def apple_signin(apple_data: AppleSignIn, db: Session = Depends(get_db)):
    """Sign in or register with Apple"""
    if not settings.APPLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Apple OAuth is not configured"
        )
    
    # Verify Apple token
    try:
        apple_user_info = verify_apple_token(apple_data.id_token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to verify Apple token: {str(e)}"
        )
    
    email = apple_user_info.get('email')
    provider_id = apple_user_info.get('provider_id')
    
    if not provider_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Apple token: missing user ID"
        )
    
    # Check if user exists by provider_id (Apple uses stable sub)
    user = db.query(UserModel).filter(UserModel.provider_id == provider_id).first()
    
    if user:
        # Update email if provided and different
        if email and user.email != email:
            # Check if email is already used by another account
            existing_email_user = db.query(UserModel).filter(
                UserModel.email == email,
                UserModel.id != user.id
            ).first()
            if not existing_email_user:
                user.email = email
                db.commit()
                db.refresh(user)
    else:
        # For new users, email might not be in token (Apple only sends it on first sign-in)
        # Use email from token if available, otherwise we'll need to handle it
        if not email:
            # If email is not in token, check if it's in the user object from first sign-in
            if apple_data.user and apple_data.user.get('email'):
                email = apple_data.user.get('email')
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is required for first-time Apple sign-in"
                )
        
        # Generate username from email if not provided
        username_base = email.split('@')[0] if email else f"apple_user_{provider_id[:8]}"
        username = username_base
        counter = 1
        while db.query(UserModel).filter(UserModel.username == username).first():
            username = f"{username_base}{counter}"
            counter += 1
        
        user = UserModel(
            email=email,
            username=username,
            hashed_password=None,
            provider='apple',
            provider_id=provider_id,
            is_active=True,
            is_verified=apple_user_info.get('email_verified', False)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=User.model_validate(user)
    )


@router.post("/logout")
async def logout():
    """Logout current user"""
    # For JWT tokens, logout is typically handled client-side by removing the token
    # Server-side logout would require token blacklisting, which is not implemented here
    return {"message": "Logged out successfully"}

