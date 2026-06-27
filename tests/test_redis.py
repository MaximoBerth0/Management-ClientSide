import asyncio
import uuid

from fasthelm.storage.redis import RedisTokenBucket


def _key():
    """A unique bucket key per test, so tests never share state."""
    return f"test:{uuid.uuid4()}"


async def test_allows_full_burst_then_rejects(redis_client):
    bucket = RedisTokenBucket(redis_client, capacity=3, refill_rate=1.0)
    key = _key()

    for i in range(3):
        d = await bucket.check(key)
        assert d.allowed is True
        assert d.limit == 3
        assert d.remaining == 3 - (i + 1)

    d = await bucket.check(key)
    assert d.allowed is False
    assert d.remaining == 0
    assert d.retry_after > 0


async def test_refill_restores_capacity_after_wait(redis_client):
    # fast refill so the test only sleeps a fraction of a second
    bucket = RedisTokenBucket(redis_client, capacity=2, refill_rate=20.0)
    key = _key()

    for _ in range(2):
        await bucket.check(key)
    assert (await bucket.check(key)).allowed is False  # drained

    await asyncio.sleep(0.2)  # 20 tokens/sec * 0.2s = 4, capped at capacity
    assert (await bucket.check(key)).allowed is True


async def test_separate_keys_have_independent_buckets(redis_client):
    bucket = RedisTokenBucket(redis_client, capacity=1, refill_rate=1.0)
    a, b = _key(), _key()

    assert (await bucket.check(a)).allowed is True
    assert (await bucket.check(a)).allowed is False  # a is drained
    assert (await bucket.check(b)).allowed is True   # b is untouched


async def test_cost_consumes_multiple_tokens(redis_client):
    bucket = RedisTokenBucket(redis_client, capacity=5, refill_rate=1.0)
    key = _key()

    d = await bucket.check(key, cost=3)
    assert d.allowed is True
    assert d.remaining == 2

    d = await bucket.check(key, cost=3)  # only 2 left
    assert d.allowed is False
