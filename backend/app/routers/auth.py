"""
TradeVision Pro — Authentication API Router
Login, register, token management — all local, no external services.
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.auth import (
    Token, User, UserCreate,
    authenticate_user, create_access_token, create_user,
    get_current_user, require_auth
)
from app.core.config import settings

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login with username & password to get a JWT token.
    
    Default credentials:
    - username: admin
    - password: tradevision2026
    
    Use the returned access_token as Bearer token in subsequent requests.
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=expires,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    )


@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """
    Register a new local user.
    All data stays on your machine in users.json.
    """
    user = create_user(user_data)
    return {
        "message": f"User '{user.username}' created successfully",
        "user": {
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
        },
    }


@router.get("/me", response_model=dict)
async def get_me(current_user: User = Depends(require_auth)):
    """Get current authenticated user info."""
    return {
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(require_auth)):
    """Refresh your JWT token (requires valid current token)."""
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.username, "role": current_user.role},
        expires_delta=expires,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
        },
    )


@router.get("/token-info")
async def token_info():
    """Show info about how the local token system works."""
    return {
        "auth_type": "JWT (JSON Web Token)",
        "storage": "Local (users.json + .env secret)",
        "token_expiry_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "default_credentials": {
            "username": settings.ADMIN_USERNAME,
            "password": "tradevision2026 (change in .env)",
        },
        "endpoints": {
            "login": "POST /api/auth/login (form: username, password)",
            "register": "POST /api/auth/register (json: username, email, password)",
            "me": "GET /api/auth/me (Bearer token required)",
            "refresh": "POST /api/auth/refresh (Bearer token required)",
        },
        "usage": "Include 'Authorization: Bearer <token>' header in requests",
    }
