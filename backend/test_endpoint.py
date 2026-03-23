import sys
import os
import httpx
import asyncio

async def test_endpoint():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get('http://127.0.0.1:8000/api/dashboard/riesgo-desercion')
            print("Status:", resp.status_code)
            print("JSON payload:", resp.json())
    except Exception as e:
        print("Error requests:", e)

if __name__ == "__main__":
    asyncio.run(test_endpoint())
