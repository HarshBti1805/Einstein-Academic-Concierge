# Auto-Registration System

A priority-based course registration system that handles concurrent requests and optimally matches students to courses based on multiple factors.

## Overview

This system solves the two-sided matching problem where:
- **Students** want their highest-priority courses
- **University** wants the best-fit students for each course

It's **not** first-come-first-serve (FCFS). Instead, it uses a composite scoring system that considers GPA, interest match, application time, and other factors.

## Features

- **Priority Queue Waitlists**: Each course maintains a sorted waitlist based on composite scores
- **Configurable Scoring**: Adjust weights for GPA, interests, time, year, prerequisites
- **Multiple Allocation Strategies**: Balanced, student-optimal, course-optimal, greedy
- **Concurrent-Safe**: Distributed locking for vacancy fills
- **Auto-Fill on Dropout**: Automatically fills vacancies from waitlist
- **Batch Processing**: Periodic batch allocation for fair distribution

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AutoRegistrationSystem                       │
│                      (main.py - High-level API)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    RegistrationService                          │
│              (services/registration_service.py)                 │
│         Orchestrates all operations, manages state              │
└───────┬─────────────────────┬─────────────────────┬─────────────┘
        │                     │                     │
┌───────▼───────┐   ┌─────────▼─────────┐   ┌──────▼──────┐
│ ScoringEngine │   │ AllocationEngine  │   │  Waitlist   │
│ (core/scoring)│   │ (core/allocation) │   │  Manager    │
│               │   │                   │   │(core/waitlist)
│ Computes      │   │ Batch allocation  │   │             │
│ composite     │   │ Vacancy fills     │   │ Redis-based │
│ scores        │   │ Manual register   │   │ priority    │
│               │   │                   │   │ queues      │
└───────────────┘   └───────────────────┘   └─────────────┘
```

## Scoring Formula

```
score = (w1 × gpa_score) + (w2 × interest_score) + (w3 × time_score) + (w4 × year_score) + (w5 × prereq_score)
```

Default weights:
- GPA: 35%
- Interest Match: 30%
- Early Application Bonus: 20%
- Year Fit: 10%
- Prerequisites: 5%

### Time Decay

The early application bonus decays exponentially:
```
time_bonus = max_bonus × e^(-λ × hours_since_open)
```

This gives early applicants an advantage that diminishes over time, preventing pure FCFS while still rewarding prompt applications.

## Quick Start

```python
from main import AutoRegistrationSystem

# Initialize
system = AutoRegistrationSystem(
    gpa_weight=0.35,
    interest_weight=0.30,
    time_weight=0.20,
    year_weight=0.10,
    prereq_weight=0.05,
    strategy="balanced"
)

# Add course
system.add_course(
    course_id="ML301",
    name="Machine Learning",
    department="CS",
    capacity=20,
    prerequisites=["CS201"],
    tags=["machine-learning", "ai", "python"],
    min_gpa=3.0,
    preferred_years=[3, 4]
)

# Add student
system.add_student(
    student_id="S001",
    name="Alice",
    email="alice@uni.edu",
    gpa=3.8,
    major="CS",
    year=3,
    interests=["machine-learning", "ai"],
    completed_courses=["CS101", "CS201"]
)

# Set preferences (from your recommendation system)
system.set_student_preferences("S001", ["ML301", "CS201", "STAT301"])

# Open booking
system.open_booking("ML301")

# Student applies
result = system.apply("S001", "ML301")
print(result)
# {'success': True, 'status': 'waitlisted', 'waitlist_position': 1, 'score': 0.82}

# Run batch allocation
allocations = system.run_allocation()

# Handle dropout
fill_result = system.process_dropout("S002", "ML301")
```

## Registration States

```
BOOKING_CLOSED  ──→ Students join waitlist, await batch allocation
       │
       ▼
BOOKING_OPEN    ──→ Vacancy: manual registration possible
       │            Full: waitlist only
       ▼
COURSE_STARTED  ──→ Dropout triggers auto-fill from waitlist
       │
       ▼
COURSE_COMPLETED ──→ No more registrations
```

## Manual vs Auto Registration

| Scenario | Registration Type |
|----------|------------------|
| Booking closed | Auto (waitlist → batch allocation) |
| Booking open + vacancy | Manual registration available |
| Booking open + full | Auto (waitlist → wait for vacancy) |
| Course started + dropout | Auto (top waitlisted student fills) |

## Allocation Strategies

### Balanced (Default)
Considers both student preferences and course fit. Good for most use cases.

### Student-Optimal
Uses deferred acceptance (Gale-Shapley). Students get their best possible course given competition.

### Course-Optimal
Courses get their best possible students. May not respect student preferences as much.

### Greedy
Simple greedy by score. Fast but may not be globally optimal.

## Running Tests

```bash
cd auto-registration

# Basic tests and demo
python tests/test_demo.py

# Large-scale stress test (800 students, 200 seats)
python tests/test_large_scale.py
```

## Project Structure

```
auto-registration/
├── main.py                 # High-level API
├── models/
│   └── entities.py         # Data models (Student, Course, etc.)
├── core/
│   ├── scoring.py          # Scoring engine
│   ├── waitlist.py         # Waitlist manager (Redis)
│   └── allocation.py       # Allocation algorithms
├── services/
│   └── registration_service.py  # Main orchestrator
└── tests/
    ├── test_demo.py        # Basic tests
    └── test_large_scale.py # Stress tests
```

## Production Considerations

### Redis
The current implementation uses an in-memory Redis simulation. For production:
```python
import redis
from core.waitlist import WaitlistManager

redis_client = redis.Redis(host='localhost', port=6379, db=0)
waitlist = WaitlistManager(redis_client=redis_client)
```

### Database
Student and course data is currently stored in memory. Integrate with your database:
```python
# In your integration layer
def sync_from_database():
    students = db.query("SELECT * FROM students")
    for s in students:
        system.add_student_from_dict(s)
```

### Distributed Locking
For high-concurrency vacancy fills, consider:
- Redis Redlock
- Database advisory locks
- Distributed coordination service (etcd, ZooKeeper)

## API Reference

### AutoRegistrationSystem

| Method | Description |
|--------|-------------|
| `add_student(...)` | Add a student |
| `add_course(...)` | Add a course |
| `set_student_preferences(student_id, course_ids)` | Set preferences |
| `open_booking(course_id)` | Open course booking |
| `apply(student_id, course_id)` | Submit application |
| `manual_register(student_id, course_id)` | Immediate registration |
| `run_allocation(course_ids=None)` | Run batch allocation |
| `process_dropout(student_id, course_id)` | Handle dropout |
| `get_student_status(student_id)` | Get student status |
| `get_course_status(course_id)` | Get course status |

## License

MIT