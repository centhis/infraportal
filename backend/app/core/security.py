from datetime import timedelta
import base64

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi.security import OAuth2PasswordBearer
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.jwt_provider import JwtProvider
from app.core.config import settings

ph = PasswordHasher()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=settings.API_PREFIX + "/auth/login")

ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=30)

jwt_provider = JwtProvider()

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def create_token(data: dict, expires_delta: timedelta, token_type: str):
    return jwt_provider.create_token(data, expires_delta, token_type)

def decode_token(token: str):
    return jwt_provider.decode_token(token)

# --- Reversible Encryption (Fernet) ---

def _get_fernet() -> Fernet:
    """
    Generates a Fernet instance using the application's SECRET_KEY.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=settings.SECRET_KEY.encode(),
        iterations=100000,
    )
    # Derive key from a static application context string
    # uniqueness is guaranteed by the salt (SECRET_KEY)
    key = base64.urlsafe_b64encode(kdf.derive(b"infraportal_app_key"))
    return Fernet(key)

def encrypt_value(value: str) -> str:
    """Encrypts a string value using Fernet (reversible)."""
    if not value:
        return value
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    """Decrypts a Fernet-encrypted string value."""
    if not encrypted_value:
        return encrypted_value
    f = _get_fernet()
    return f.decrypt(encrypted_value.encode()).decode()