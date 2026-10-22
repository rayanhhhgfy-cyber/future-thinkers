"""Storage router — Cloudflare R2 when its env vars are set, Turso otherwise.

Same public interface in both modes:
    save_file / read_file / delete_file / MAX_SIZE / PROVIDER /
    public_url_for / USE_R2

R2 is active only when ALL of R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
R2_SECRET_ACCESS_KEY and R2_PUBLIC_URL are set. Without them, behaviour is
exactly the Turso storage from before (storage_turso.py), so deploying this
changes nothing until the credentials are added to the environment.
"""

import os

REQUIRED_R2_VARS = (
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_URL",
)

USE_R2 = all(os.environ.get(k) for k in REQUIRED_R2_VARS)

if USE_R2:
    from storage_r2 import (  # noqa: F401
        save_file, read_file, delete_file, MAX_SIZE, PROVIDER, public_url_for,
    )
else:
    from storage_turso import save_file, read_file, delete_file, MAX_SIZE  # noqa: F401

    PROVIDER = "turso"

    def public_url_for(path):  # noqa: D103 - Turso files have no public URL
        return None

__all__ = [
    "save_file", "read_file", "delete_file", "MAX_SIZE",
    "PROVIDER", "public_url_for", "USE_R2",
]
