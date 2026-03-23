from datetime import datetime, date
from zoneinfo import ZoneInfo

PERU_TZ = ZoneInfo("America/Lima")

def get_peru_now() -> datetime:
    return datetime.now(PERU_TZ)

def get_peru_today() -> date:
    return get_peru_now().date()
