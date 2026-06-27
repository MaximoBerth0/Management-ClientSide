import asyncio

import pytest
from redis.asyncio import Redis
from testcontainers.redis import RedisContainer

from fasthelm.core.token_bucket import TokenBucket


class FakeStorage:
    def __init__(self):
        self._data = {}
        self.lock = asyncio.Lock()

    async def get(self, key):
        return self._data.get(key)

    async def set(self, key, value):
        self._data[key] = value


class FakeClock:
    def __init__(self, start=0.0):
        self.t = start
    def __call__(self):
        return self.t
    def advance(self, seconds):
        self.t += seconds


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def make_bucket(clock):
    """build a TokenBucket sharing the test's clock fixture"""
    def _make(capacity=3, refill_rate=1.0):
        return TokenBucket(FakeStorage(), capacity=capacity, refill_rate=refill_rate, now=clock)
    return _make


@pytest.fixture
def bucket(make_bucket):
    """A ready-to-use bucket capacity=3, refill_rate=1.0/sec."""
    return make_bucket()


# real-redis fixtures (used by test_redis.py)


@pytest.fixture(scope="session")
def redis_container():
    """Start one real redis:7 container for the whole test session."""
    with RedisContainer("redis:7") as container:
        yield container


@pytest.fixture
async def redis_client(redis_container):
    """A fresh async client per test, with the DB flushed beforehand.

    decode_responses=True so the Lua script's tostring(tokens) comes back as
    str (RedisTokenBucket does float(tokens_str), which rejects bytes).
    """
    host = redis_container.get_container_host_ip()
    port = int(redis_container.get_exposed_port(6379))
    client = Redis(host=host, port=port, decode_responses=True)
    await client.flushdb()
    try:
        yield client
    finally:
        await client.aclose()