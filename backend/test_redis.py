import redis

try:
    r = redis.Redis(host='localhost', port=6379, db=0)
    response = r.ping()
    print("Redis Ping Response:", response)
except Exception as e:
    print("Redis Error:", e)
