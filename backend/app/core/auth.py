"""
TradeVision Pro — Local Authentication System
Generates and validates JWT tokens locally.
No external auth provider needed — everything runs on your machine.

Uses hashlib (SHA-256 + salt) for password hashing instead of bcrypt,
to avoid dependency issues across Python versions.
"""
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings

# OAuth2 scheme — token comes from /api/auth/login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Local user database file (stored alongside the .env)
USERS_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "users.json")


# ── Password Hashing (SHA-256 + salt, no external deps) ──
def hash_password(password: str) -> str:
    """Hash a password with a random salt using SHA-256."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    if "$" not in hashed_password:
        return False
    salt, expected_hash = hashed_password.split("$", 1)
    actual_hash = hashlib.sha256(f"{salt}:{plain_password}".encode()).hexdigest()
    return secrets.compare_digest(actual_hash, expected_hash)


# ── Models ──
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict


class TokenData(BaseModel):
    username: Optional[str] = None


class User(BaseModel):
    username: str
    email: str
    full_name: str = ""
    disabled: bool = False
    role: str = "user"


class UserInDB(User):
    hashed_password: str


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = ""


# ── Local User Store ──
def _load_users() -> dict:
    """Load users from local JSON file."""
    if os.path.exists(USERS_DB_PATH):
        with open(USERS_DB_PATH, "r") as f:
            return json.load(f)
    return {}


def _save_users(users: dict):
    """Save users to local JSON file."""
    with open(USERS_DB_PATH, "w") as f:
        json.dump(users, f, indent=2)


def _ensure_admin():
    """Create default admin user if not exists."""
    users = _load_users()
    if settings.ADMIN_USERNAME not in users:
        users[settings.ADMIN_USERNAME] = {
            "username": settings.ADMIN_USERNAME,
            "email": settings.ADMIN_EMAIL,
            "full_name": "Admin",
            "hashed_password": hash_password(settings.ADMIN_PASSWORD),
            "disabled": False,
            "role": "admin",
        }
        _save_users(users)


# Initialize admin on module load
_ensure_admin()


# ── Auth Functions ──
def get_user(username: str) -> Optional[UserInDB]:
    users = _load_users()
    if username in users:
        return UserInDB(**users[username])
    return None


def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT token locally."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_user(user_data: UserCreate) -> User:
    """Register a new local user."""
    users = _load_users()
    if user_data.username in users:
        raise HTTPException(status_code=400, detail="Username already exists")

    users[user_data.username] = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hash_password(user_data.password),
        "disabled": False,
        "role": "user",
    }
    _save_users(users)
    return User(**{k: v for k, v in users[user_data.username].items() if k != "hashed_password"})


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    """Validate JWT token and return current user. Returns None if no token (guest mode)."""
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None

    user = get_user(username)
    if user is None or user.disabled:
        return None
    return User(**user.model_dump(exclude={"hashed_password"}))


async def require_auth(token: str = Depends(oauth2_scheme)) -> User:
    """Require valid JWT token — rejects unauthenticated requests."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Login at /api/auth/login",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = get_user(username)
    if user is None or user.disabled:
        raise HTTPException(status_code=401, detail="User not found or disabled")
    return User(**user.model_dump(exclude={"hashed_password"}))
