async def test_allows_full_burst_then_rejects(bucket):
    # bucket fixture: capacity=3, refill_rate=1.0
    for i in range(3):
        d = await bucket.check("ip:1.2.3.4")
        assert d.allowed is True
        assert d.remaining == 3 - (i + 1)

    # bucket is now empty so the next request is rejected
    d = await bucket.check("ip:1.2.3.4")
    assert d.allowed is False
    assert d.remaining == 0
    assert d.retry_after > 0


async def test_refill_restores_capacity_after_wait(bucket, clock):
    for _ in range(3):
        await bucket.check("k")
    assert (await bucket.check("k")).allowed is False  # drained

    clock.advance(1.0)  # 1 token/sec * 1s = 1 token back
    assert (await bucket.check("k")).allowed is True
