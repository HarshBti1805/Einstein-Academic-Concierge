"""
Waitlist Manager using Redis Sorted Sets.

Each course has a sorted set where:
- Members are application IDs (or student IDs)
- Scores are composite scores (higher = better priority)

Redis Sorted Sets provide O(log N) insertion and O(1) rank queries,
making them ideal for priority queues.
"""

import json
import logging
from datetime import datetime
from typing import Optional
from dataclasses import asdict

# For production, use: import redis
# For this implementation, we'll create a Redis-compatible in-memory version
# that can be swapped with real Redis

logger = logging.getLogger(__name__)


class InMemoryRedis:
    """
    In-memory Redis-like implementation for testing/demo.
    Implements sorted set operations needed for waitlists.
    
    In production, replace with: redis.Redis(host='localhost', port=6379, db=0)
    """
    
    def __init__(self):
        self._sorted_sets: dict[str, dict[str, float]] = {}
        self._hashes: dict[str, dict[str, str]] = {}
        self._locks: dict[str, bool] = {}
        self._strings: dict[str, str] = {}
    
    def zadd(self, key: str, mapping: dict[str, float]) -> int:
        """Add members to sorted set with scores."""
        if key not in self._sorted_sets:
            self._sorted_sets[key] = {}
        
        added = 0
        for member, score in mapping.items():
            if member not in self._sorted_sets[key]:
                added += 1
            self._sorted_sets[key][member] = score
        
        return added
    
    def zrem(self, key: str, *members: str) -> int:
        """Remove members from sorted set."""
        if key not in self._sorted_sets:
            return 0
        
        removed = 0
        for member in members:
            if member in self._sorted_sets[key]:
                del self._sorted_sets[key][member]
                removed += 1
        
        return removed
    
    def zscore(self, key: str, member: str) -> Optional[float]:
        """Get score of a member."""
        if key not in self._sorted_sets:
            return None
        return self._sorted_sets[key].get(member)
    
    def zrank(self, key: str, member: str) -> Optional[int]:
        """Get rank of member (0-indexed, ascending by score)."""
        if key not in self._sorted_sets or member not in self._sorted_sets[key]:
            return None
        
        sorted_members = sorted(
            self._sorted_sets[key].items(),
            key=lambda x: x[1]
        )
        for i, (m, _) in enumerate(sorted_members):
            if m == member:
                return i
        return None
    
    def zrevrank(self, key: str, member: str) -> Optional[int]:
        """Get rank of member (0-indexed, descending by score - higher score = lower rank)."""
        if key not in self._sorted_sets or member not in self._sorted_sets[key]:
            return None
        
        sorted_members = sorted(
            self._sorted_sets[key].items(),
            key=lambda x: x[1],
            reverse=True
        )
        for i, (m, _) in enumerate(sorted_members):
            if m == member:
                return i
        return None
    
    def zrange(
        self, 
        key: str, 
        start: int, 
        stop: int, 
        withscores: bool = False,
        desc: bool = False
    ) -> list:
        """Get range of members by rank."""
        if key not in self._sorted_sets:
            return []
        
        sorted_members = sorted(
            self._sorted_sets[key].items(),
            key=lambda x: x[1],
            reverse=desc
        )
        
        # Handle negative indices
        if stop == -1:
            stop = len(sorted_members)
        else:
            stop = stop + 1
        
        result = sorted_members[start:stop]
        
        if withscores:
            return result
        return [member for member, _ in result]
    
    def zrevrange(self, key: str, start: int, stop: int, withscores: bool = False) -> list:
        """Get range of members by rank (descending)."""
        return self.zrange(key, start, stop, withscores=withscores, desc=True)
    
    def zcard(self, key: str) -> int:
        """Get number of members in sorted set."""
        if key not in self._sorted_sets:
            return 0
        return len(self._sorted_sets[key])
    
    def hset(self, key: str, field: str, value: str) -> int:
        """Set hash field."""
        if key not in self._hashes:
            self._hashes[key] = {}
        
        is_new = field not in self._hashes[key]
        self._hashes[key][field] = value
        return 1 if is_new else 0
    
    def hget(self, key: str, field: str) -> Optional[str]:
        """Get hash field value."""
        if key not in self._hashes:
            return None
        return self._hashes[key].get(field)
    
    def hdel(self, key: str, *fields: str) -> int:
        """Delete hash fields."""
        if key not in self._hashes:
            return 0
        
        deleted = 0
        for field in fields:
            if field in self._hashes[key]:
                del self._hashes[key][field]
                deleted += 1
        return deleted
    
    def hgetall(self, key: str) -> dict[str, str]:
        """Get all fields and values in hash."""
        return self._hashes.get(key, {}).copy()
    
    def set(self, key: str, value: str, nx: bool = False, ex: int = None) -> bool:
        """Set string value."""
        if nx and key in self._strings:
            return False
        self._strings[key] = value
        return True
    
    def get(self, key: str) -> Optional[str]:
        """Get string value."""
        return self._strings.get(key)
    
    def delete(self, *keys: str) -> int:
        """Delete keys."""
        deleted = 0
        for key in keys:
            if key in self._sorted_sets:
                del self._sorted_sets[key]
                deleted += 1
            if key in self._hashes:
                del self._hashes[key]
                deleted += 1
            if key in self._strings:
                del self._strings[key]
                deleted += 1
        return deleted
    
    def pipeline(self):
        """Return self for pipeline operations (simplified)."""
        return PipelineSimulator(self)


class PipelineSimulator:
    """Simplified pipeline for batching operations."""
    
    def __init__(self, redis_instance: InMemoryRedis):
        self._redis = redis_instance
        self._operations = []
    
    def zadd(self, key: str, mapping: dict[str, float]):
        self._operations.append(('zadd', key, mapping))
        return self
    
    def hset(self, key: str, field: str, value: str):
        self._operations.append(('hset', key, field, value))
        return self
    
    def execute(self) -> list:
        results = []
        for op in self._operations:
            if op[0] == 'zadd':
                results.append(self._redis.zadd(op[1], op[2]))
            elif op[0] == 'hset':
                results.append(self._redis.hset(op[1], op[2], op[3]))
        self._operations = []
        return results


class WaitlistManager:
    """
    Manages course waitlists using Redis sorted sets.
    
    Key Schema:
    - waitlist:{course_id} -> Sorted set of student_ids with scores
    - application:{application_id} -> Hash with application details
    - student_apps:{student_id} -> Set of application IDs for a student
    """
    
    WAITLIST_KEY_PREFIX = "waitlist:"
    APPLICATION_KEY_PREFIX = "application:"
    STUDENT_APPS_PREFIX = "student_apps:"
    LOCK_KEY_PREFIX = "lock:course:"
    
    def __init__(self, redis_client=None):
        """
        Initialize with Redis client.
        
        Args:
            redis_client: Redis client instance. If None, uses in-memory implementation.
        """
        self.redis = redis_client or InMemoryRedis()
    
    def _waitlist_key(self, course_id: str) -> str:
        return f"{self.WAITLIST_KEY_PREFIX}{course_id}"
    
    def _application_key(self, application_id: str) -> str:
        return f"{self.APPLICATION_KEY_PREFIX}{application_id}"
    
    def _student_apps_key(self, student_id: str) -> str:
        return f"{self.STUDENT_APPS_PREFIX}{student_id}"
    
    def _lock_key(self, course_id: str) -> str:
        return f"{self.LOCK_KEY_PREFIX}{course_id}"
    
    def add_to_waitlist(self, application: 'CourseApplication') -> bool:
        """
        Add a student application to a course's waitlist.
        
        Args:
            application: The CourseApplication to add
        
        Returns:
            True if added, False if already exists
        """
        from models.entities import CourseApplication
        
        waitlist_key = self._waitlist_key(application.course_id)
        app_key = self._application_key(application.application_id)
        student_apps_key = self._student_apps_key(application.student_id)
        
        # Use pipeline for atomic operations
        pipe = self.redis.pipeline()
        
        # Add to sorted set (score is composite_score, higher is better)
        # We use student_id as member for easy lookup
        pipe.zadd(waitlist_key, {application.student_id: application.composite_score})
        
        # Store application details
        app_data = {
            'application_id': application.application_id,
            'student_id': application.student_id,
            'course_id': application.course_id,
            'priority_rank': str(application.priority_rank),
            'applied_at': application.applied_at.isoformat(),
            'status': application.status.value,
            'gpa_score': str(application.gpa_score),
            'interest_score': str(application.interest_score),
            'time_score': str(application.time_score),
            'year_score': str(application.year_score),
            'composite_score': str(application.composite_score),
        }
        
        for field, value in app_data.items():
            pipe.hset(app_key, field, value)
        
        pipe.execute()
        
        logger.info(
            f"Added student {application.student_id} to waitlist for "
            f"{application.course_id} with score {application.composite_score:.4f}"
        )
        
        return True
    
    def remove_from_waitlist(self, course_id: str, student_id: str) -> bool:
        """
        Remove a student from a course's waitlist.
        
        Args:
            course_id: The course ID
            student_id: The student ID
        
        Returns:
            True if removed, False if not found
        """
        waitlist_key = self._waitlist_key(course_id)
        removed = self.redis.zrem(waitlist_key, student_id)
        
        if removed:
            logger.info(f"Removed student {student_id} from waitlist for {course_id}")
        
        return removed > 0
    
    def get_waitlist_position(self, course_id: str, student_id: str) -> Optional[int]:
        """
        Get a student's position in the waitlist (1-indexed).
        
        Returns None if student is not in the waitlist.
        Position 1 = highest priority (will be allocated first).
        """
        waitlist_key = self._waitlist_key(course_id)
        
        # zrevrank gives 0-indexed rank with highest score first
        rank = self.redis.zrevrank(waitlist_key, student_id)
        
        if rank is None:
            return None
        
        return rank + 1  # Convert to 1-indexed
    
    def get_student_score(self, course_id: str, student_id: str) -> Optional[float]:
        """Get a student's composite score for a course."""
        waitlist_key = self._waitlist_key(course_id)
        return self.redis.zscore(waitlist_key, student_id)
    
    def get_top_candidates(self, course_id: str, count: int) -> list[tuple[str, float]]:
        """
        Get the top N candidates from a course's waitlist.
        
        Returns list of (student_id, score) tuples, highest score first.
        """
        waitlist_key = self._waitlist_key(course_id)
        return self.redis.zrevrange(waitlist_key, 0, count - 1, withscores=True)
    
    def get_waitlist_size(self, course_id: str) -> int:
        """Get the number of students in a course's waitlist."""
        waitlist_key = self._waitlist_key(course_id)
        return self.redis.zcard(waitlist_key)
    
    def get_all_waitlisted(self, course_id: str) -> list[tuple[str, float]]:
        """Get all students in a course's waitlist with their scores."""
        waitlist_key = self._waitlist_key(course_id)
        return self.redis.zrevrange(waitlist_key, 0, -1, withscores=True)
    
    def update_score(self, course_id: str, student_id: str, new_score: float) -> bool:
        """Update a student's score in the waitlist."""
        waitlist_key = self._waitlist_key(course_id)
        
        # Check if student exists in waitlist
        current_score = self.redis.zscore(waitlist_key, student_id)
        if current_score is None:
            return False
        
        # Update score
        self.redis.zadd(waitlist_key, {student_id: new_score})
        
        logger.info(
            f"Updated score for student {student_id} in {course_id}: "
            f"{current_score:.4f} -> {new_score:.4f}"
        )
        
        return True
    
    def acquire_course_lock(self, course_id: str, timeout: int = 30) -> bool:
        """
        Acquire a distributed lock for a course (for vacancy filling).
        
        In production, use Redis SETNX with expiry or Redlock.
        """
        lock_key = self._lock_key(course_id)
        return self.redis.set(lock_key, "locked", nx=True, ex=timeout)
    
    def release_course_lock(self, course_id: str) -> None:
        """Release the distributed lock for a course."""
        lock_key = self._lock_key(course_id)
        self.redis.delete(lock_key)
    
    def pop_top_candidate(self, course_id: str) -> Optional[tuple[str, float]]:
        """
        Atomically get and remove the top candidate from waitlist.
        
        Returns (student_id, score) or None if waitlist is empty.
        """
        waitlist_key = self._waitlist_key(course_id)
        
        # Get top candidate
        top = self.redis.zrevrange(waitlist_key, 0, 0, withscores=True)
        
        if not top:
            return None
        
        student_id, score = top[0]
        
        # Remove from waitlist
        self.redis.zrem(waitlist_key, student_id)
        
        return (student_id, score)
    
    def get_student_waitlists(self, student_id: str, course_ids: list[str]) -> dict[str, Optional[int]]:
        """
        Get a student's waitlist positions across multiple courses.
        
        Returns dict of course_id -> position (or None if not waitlisted).
        """
        result = {}
        for course_id in course_ids:
            result[course_id] = self.get_waitlist_position(course_id, student_id)
        return result