import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.services.dashboard_service import get_riesgo_desercion
from app.redis_client import redis_client

if redis_client:
    print("Keys in redis:")
    keys = redis_client.keys("dashboard:riesgo_desercion:*")
    for k in keys:
        print(k.decode(), redis_client.get(k).decode())

db = SessionLocal()
print("Direct db call None:")
try:
    res = get_riesgo_desercion(db, None)
    print([r.dict() for r in res.riesgos])
except Exception as e:
    print("Error:", e)
    
print("Direct db call [4]:")
try:
    res2 = get_riesgo_desercion(db, [4])
    print([r.dict() for r in res2.riesgos])
except Exception as e:
    print("Error:", e)
