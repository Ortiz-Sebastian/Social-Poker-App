from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
import google.auth.transport.requests
from google.oauth2 import id_token
import requests

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_google_token(token: str) -> Dict[str, Any]:
    """Verify Google ID token and return user info"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured"
        )
    
    try:
        request = google.auth.transport.requests.Request()
        idinfo = id_token.verify_oauth2_token(token, request, settings.GOOGLE_CLIENT_ID)
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        return {
            'email': idinfo.get('email'),
            'provider_id': idinfo.get('sub'),
            'full_name': idinfo.get('name'),
            'email_verified': idinfo.get('email_verified', False)
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to verify Google token: {str(e)}")


def verify_apple_token(token: str) -> Dict[str, Any]:
    """Verify Apple ID token and return user info"""
    if not settings.APPLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Apple OAuth is not configured"
        )
    
    try:
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.backends import default_backend
        import base64
        
        # Decode the token header to get the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        
        if not kid:
            raise ValueError('Token missing key ID')
        
        # Get Apple's public keys
        apple_keys_url = 'https://appleid.apple.com/auth/keys'
        response = requests.get(apple_keys_url, timeout=10)
        response.raise_for_status()
        keys = response.json().get('keys', [])
        
        # Find the key with matching kid
        key_data = None
        for k in keys:
            if k.get('kid') == kid:
                key_data = k
                break
        
        if not key_data:
            raise ValueError('Apple key not found')
        
        # Convert JWK to RSA public key
        # Handle base64 padding
        n_str = key_data['n']
        e_str = key_data['e']
        n = base64.urlsafe_b64decode(n_str + '==' if len(n_str) % 4 == 2 else n_str + '=' if len(n_str) % 4 == 3 else n_str)
        e = base64.urlsafe_b64decode(e_str + '==' if len(e_str) % 4 == 2 else e_str + '=' if len(e_str) % 4 == 3 else e_str)
        
        n_int = int.from_bytes(n, 'big')
        e_int = int.from_bytes(e, 'big')
        
        public_key = rsa.RSAPublicNumbers(e_int, n_int).public_key(default_backend())
        
        # Decode the token
        decoded = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=settings.APPLE_CLIENT_ID,
            issuer='https://appleid.apple.com'
        )
        
        return {
            'email': decoded.get('email'),
            'provider_id': decoded.get('sub'),
            'email_verified': decoded.get('email_verified', False)
        }
    except (JWTError, ValueError, KeyError) as e:
        raise HTTPException(status_code=401, detail=f"Invalid Apple token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to verify Apple token: {str(e)}")

