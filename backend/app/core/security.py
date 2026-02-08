import base64
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.core.jwt_provider import JwtProvider

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


# --- Обратимое шифрование (Fernet) ---


def _get_fernet() -> Fernet:
    """
    Генерирует экземпляр Fernet, используя SECRET_KEY приложения.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=settings.SECRET_KEY.encode(),
        iterations=100000,
    )
    # Получить ключ из статической строки контекста приложения
    # уникальность гарантируется солью (SECRET_KEY)
    key = base64.urlsafe_b64encode(kdf.derive(b"infraportal_app_key"))
    return Fernet(key)


def encrypt_value(value: str) -> str:
    """Шифрует строковое значение с помощью Fernet (обратимо)."""
    if not value:
        return value
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    """Расшифровывает строку, зашифрованную Fernet."""
    if not encrypted_value:
        return encrypted_value
    f = _get_fernet()
    return f.decrypt(encrypted_value.encode()).decode()
