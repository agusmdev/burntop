"""
Database performance testing script.

Tests query performance and identifies slow queries using EXPLAIN ANALYZE.

Usage:
    uv run python tests/performance_db.py
"""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, text

from app.config import get_settings
from app.database import async_session_factory
from app.leaderboard.models import LeaderboardCache
from app.usage_record.models import UsageRecord
from app.user.models import User


async def test_query_performance():
    """Test performance of key queries with EXPLAIN ANALYZE."""
    async with async_session_factory() as session:
        print("=" * 80)
        print("DATABASE PERFORMANCE TESTS")
        print("=" * 80)
        print()

        # Test 1: User by username lookup
        print("Test 1: User by username lookup (indexed)")
        print("-" * 80)
        query = select(User).where(User.username == "testuser")
        explain_query = text(f"EXPLAIN ANALYZE {query.compile(compile_kwargs={'literal_binds': True})!s}")
        result = await session.execute(explain_query)
        print(result.fetchall()[0][0])
        print()

        # Test 2: Usage records by date range
        print("Test 2: Usage records by date range (indexed)")
        print("-" * 80)
        start_date = datetime.now(UTC).date() - timedelta(days=30)
        end_date = datetime.now(UTC).date()
        query = select(UsageRecord).where(
            UsageRecord.date >= start_date,
            UsageRecord.date <= end_date,
        )
        explain_query = text(f"EXPLAIN ANALYZE {query.compile(compile_kwargs={'literal_binds': True})!s}")
        result = await session.execute(explain_query)
        print(result.fetchall()[0][0])
        print()

        # Test 3: Leaderboard rankings with filtering
        print("Test 3: Leaderboard rankings (indexed)")
        print("-" * 80)
        query = (
            select(LeaderboardCache)
            .where(LeaderboardCache.leaderboard_type == "global", LeaderboardCache.period == "all")
            .order_by(LeaderboardCache.rank)
            .limit(100)
        )
        explain_query = text(f"EXPLAIN ANALYZE {query.compile(compile_kwargs={'literal_binds': True})!s}")
        result = await session.execute(explain_query)
        print(result.fetchall()[0][0])
        print()

        # Test 4: User with streak (one-to-one join)
        print("Test 4: User with streak join (indexed)")
        print("-" * 80)
        query = select(User).join(User.streak).where(User.username == "testuser")
        explain_query = text(f"EXPLAIN ANALYZE {query.compile(compile_kwargs={'literal_binds': True})!s}")
        result = await session.execute(explain_query)
        print(result.fetchall()[0][0])
        print()

        # Test 5: Aggregate query (usage stats)
        print("Test 5: Aggregate query (usage stats)")
        print("-" * 80)
        query = text("""
            EXPLAIN ANALYZE
            SELECT 
                source,
                COUNT(*) as count,
                SUM(input_tokens + output_tokens) as total_tokens,
                SUM(cost) as total_cost
            FROM usage_records
            WHERE date >= :start_date AND date <= :end_date
            GROUP BY source
            ORDER BY total_tokens DESC
        """)
        result = await session.execute(query, {"start_date": start_date, "end_date": end_date})
        print(result.fetchall()[0][0])
        print()

        # Test 6: Complex leaderboard query
        print("Test 6: Complex leaderboard ranking calculation")
        print("-" * 80)
        query = text("""
            EXPLAIN ANALYZE
            SELECT 
                u.id,
                u.username,
                u.level,
                SUM(ur.input_tokens + ur.output_tokens) as total_tokens,
                SUM(ur.cost) as total_cost,
                COUNT(DISTINCT DATE(ur.usage_timestamp)) as active_days
            FROM users u
            LEFT JOIN usage_records ur ON u.id = ur.user_id
            WHERE u.is_public = true AND u.deleted_at IS NULL
            GROUP BY u.id, u.username, u.level
            HAVING SUM(ur.input_tokens + ur.output_tokens) > 0
            ORDER BY total_tokens DESC
            LIMIT 100
        """)
        result = await session.execute(query)
        print(result.fetchall()[0][0])
        print()

        print("=" * 80)
        print("PERFORMANCE TEST COMPLETE")
        print("=" * 80)
        print()
        print("KEY OBSERVATIONS:")
        print("- Look for 'Seq Scan' (bad) vs 'Index Scan' (good)")
        print("- Lower execution time is better")
        print("- Lower cost estimates are better")
        print("- Check if indexes are being used effectively")


async def test_connection_pool():
    """Test connection pool performance."""
    print()
    print("=" * 80)
    print("CONNECTION POOL PERFORMANCE TEST")
    print("=" * 80)
    print()

    settings = get_settings()
    print(f"Pool size: {settings.database_pool_size}")
    print(f"Max overflow: {settings.database_max_overflow}")
    print(f"Total connections available: {settings.database_pool_size + settings.database_max_overflow}")
    print()

    # Test concurrent connections
    async def make_query():
        async with async_session_factory() as session:
            result = await session.execute(select(User).limit(1))
            return result.scalar_one_or_none()

    print("Testing concurrent connections...")
    start_time = datetime.now(UTC)
    tasks = [make_query() for _ in range(20)]
    await asyncio.gather(*tasks)
    end_time = datetime.now(UTC)
    duration = (end_time - start_time).total_seconds()

    print(f"Completed 20 concurrent queries in {duration:.3f} seconds")
    print(f"Average: {duration / 20:.3f} seconds per query")
    print()


if __name__ == "__main__":
    asyncio.run(test_query_performance())
    asyncio.run(test_connection_pool())
