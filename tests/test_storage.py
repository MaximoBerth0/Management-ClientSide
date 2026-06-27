import asyncio

import pytest

from fasthelm.storage.memory import MemoryStorage


@pytest.fixture
def storage():
    return MemoryStorage()


async def test_set_then_get_round_trips(storage):
    await storage.set("k", 42)
    assert await storage.get("k") == 42


async def test_get_missing_key_returns_none(storage):
    # backed by dict.get, so an unknown key is None, not a KeyError or something like that 
    assert await storage.get("nope") is None


async def test_set_overwrites_existing_value(storage):
    await storage.set("k", "first")
    await storage.set("k", "second")
    assert await storage.get("k") == "second"


async def test_keys_are_independent(storage):
    await storage.set("a", 1)
    await storage.set("b", 2)
    assert await storage.get("a") == 1
    assert await storage.get("b") == 2


async def test_lock_is_an_asyncio_lock(storage):
    assert isinstance(storage.lock, asyncio.Lock)


async def test_lock_can_be_acquired_and_released(storage):
    async with storage.lock:
        assert storage.lock.locked()
    assert not storage.lock.locked()
