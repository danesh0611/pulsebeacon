from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PulseBeacon Smart Attendance API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Security
    SECRET_KEY: str = "pulsebeacon_super_secret_jwt_key_university_2026_demo"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # BLE Security Parameters
    BLE_HMAC_SECRET: str = "pulsebeacon_ble_hmac_master_secret_key_8842"
    BLE_NONCE_VALIDITY_WINDOW_SECONDS: int = 45  # Rolling nonce window
    BLE_MAX_ACCEPTABLE_DISTANCE_METERS: float = 8.0  # Max distance for classroom presence
    BLE_RSSI_PATH_LOSS_EXPONENT: float = 2.4  # Indoor classroom RF propagation factor
    BLE_REFERENCE_RSSI_1M: float = -59.0  # Measured RSSI at 1m for faculty mobile phone
    
    # Database
    DATABASE_URL: str = "sqlite:///./attendance.db"
    POSTGRES_DATABASE_URL: Optional[str] = None
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
