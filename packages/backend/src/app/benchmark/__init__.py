"""Benchmark module for community statistics and user insights."""

from app.benchmark.dependencies import get_benchmark_repository, get_benchmark_service
from app.benchmark.models import CommunityBenchmark
from app.benchmark.repository import CommunityBenchmarkRepository
from app.benchmark.router import router
from app.benchmark.schemas import (
    CommunityBenchmarkCreate,
    CommunityBenchmarkResponse,
    CommunityBenchmarkUpdate,
    InsightsResponse,
    UserComparisonData,
)
from app.benchmark.service import BenchmarkService

__all__ = [
    "BenchmarkService",
    "CommunityBenchmark",
    "CommunityBenchmarkCreate",
    "CommunityBenchmarkRepository",
    "CommunityBenchmarkResponse",
    "CommunityBenchmarkUpdate",
    "InsightsResponse",
    "UserComparisonData",
    "get_benchmark_repository",
    "get_benchmark_service",
    "router",
]
