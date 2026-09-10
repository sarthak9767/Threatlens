import os


class Settings:
    APP_NAME = "Threat Lens Prototype"
    APP_VERSION = "1.0.0"

    DEBUG = os.getenv("DEBUG", "True") == "True"

    GEOLOCATION_API_KEY = os.getenv(
        "GEOLOCATION_API_KEY",
        ""
    )


settings = Settings()
