import asyncio

import pytest

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
    """A ready-to-use bucket: capacity=3, refill_rate=1.0/sec."""
    return make_bucket()