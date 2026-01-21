# Course Registration System - Integration Guide

This guide explains how to integrate the auto-registration system with your existing Next.js + Express application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your Application                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐          ┌──────────────────────────────┐  │
│  │    Next.js Frontend │◄────────►│    Express Backend           │  │
│  │                     │   REST   │                              │  │
│  │  - CourseBookingCard│◄───┐     │  - /api/registration/*       │  │
│  │  - LiveClassroomView│    │     │  - RegistrationService       │  │
│  │  - useRegistrationSocket │     │  - WaitlistService           │  │
│  │                     │    │     │  - ScoringService            │  │
│  └─────────────────────┘    │     └──────────────────────────────┘  │
│           │                 │                    │                   │
│           │ WebSocket       │                    │                   │
│           │                 │                    │                   │
│           ▼                 │                    ▼                   │
│  ┌─────────────────────────┐│     ┌──────────────────────────────┐  │
│  │   Socket.IO Client      ││     │      PostgreSQL + Prisma     │  │
│  │   (Real-time updates)   │◄─────│                              │  │
│  └─────────────────────────┘      │  - Students, Courses         │  │
│                                   │  - Enrollments, Waitlists    │  │
│                                   │  - SeatBookings              │  │
│                                   └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Step 1: Update Your Prisma Schema

Add the new models to your existing `schema.prisma`:

```prisma
// Add to your existing schema.prisma

// Add relations to existing Student model
model Student {
  // ... existing fields ...
  
  // NEW: Registration system relations
  coursePreferences  CoursePreference[]
  waitlistEntries    WaitlistEntry[]
  seatBookings       SeatBooking[]
}

// Add relations to existing Course model
model Course {
  // ... existing fields ...
  
  // NEW: Registration system relations
  coursePreferences CoursePreference[]
  waitlistEntries   WaitlistEntry[]
  seatBookings      SeatBooking[]
}

// Update Enrollment with more fields
model Enrollment {
  id           String           @id @default(uuid())
  status       EnrollmentStatus @default(PENDING)
  courseId     String
  course       Course           @relation(fields: [courseId], references: [id])
  studentId    String
  student      Student          @relation(fields: [studentId], references: [id])
  seatNumber   String?
  enrolledAt   DateTime?
  droppedAt    DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@unique([courseId, studentId])
}

enum EnrollmentStatus {
  PENDING
  WAITLISTED
  ENROLLED
  DROPPED
  REJECTED
}

// Update SeatConfig
model SeatConfig {
  id              String        @id @default(uuid())
  courseId        String        @unique
  course          Course        @relation(fields: [courseId], references: [id])
  totalSeats      Int
  rows            Int           @default(13)
  seatsPerRow     Int           @default(20)
  bookingStatus   BookingStatus @default(CLOSED)
  bookingOpensAt  DateTime?
  bookingClosesAt DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  seatBookings    SeatBooking[]
}

enum BookingStatus {
  CLOSED
  OPEN
  WAITLIST_ONLY
  STARTED
  COMPLETED
}

// NEW: Individual seat bookings
model SeatBooking {
  id           String      @id @default(uuid())
  seatConfigId String
  seatConfig   SeatConfig  @relation(fields: [seatConfigId], references: [id])
  courseId     String
  course       Course      @relation(fields: [courseId], references: [id])
  studentId    String
  student      Student     @relation(fields: [studentId], references: [id])
  seatNumber   String
  row          String
  column       Int
  bookedAt     DateTime    @default(now())
  isActive     Boolean     @default(true)

  @@unique([seatConfigId, seatNumber])
  @@unique([courseId, studentId])
}

// NEW: Course preferences from recommendation system
model CoursePreference {
  id          String   @id @default(uuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  priority    Int
  matchReason String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([studentId, courseId])
}

// NEW: Waitlist entries with scoring
model WaitlistEntry {
  id             String         @id @default(uuid())
  studentId      String
  student        Student        @relation(fields: [studentId], references: [id])
  courseId       String
  course         Course         @relation(fields: [courseId], references: [id])
  
  gpaScore       Float          @default(0)
  interestScore  Float          @default(0)
  timeScore      Float          @default(0)
  yearScore      Float          @default(0)
  compositeScore Float          @default(0)
  
  status         WaitlistStatus @default(WAITING)
  position       Int?
  appliedAt      DateTime       @default(now())
  processedAt    DateTime?
  preferredSeat  String?
  
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([studentId, courseId])
  @@index([courseId, compositeScore])
}

enum WaitlistStatus {
  WAITING
  PROCESSING
  ALLOCATED
  EXPIRED
  CANCELLED
}

// NEW: Audit trail
model RegistrationEvent {
  id        String   @id @default(uuid())
  eventType String
  studentId String
  courseId  String
  seatNumber String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([courseId])
  @@index([studentId])
}
```

Then run:
```bash
npx prisma db push
# or
npx prisma migrate dev --name add_registration_system
```

## Step 2: Install Backend Dependencies

```bash
npm install socket.io cors helmet
npm install -D @types/cors
```

## Step 3: Add Backend Services

Copy these files to your Express server:

```
your-server/
├── src/
│   ├── services/
│   │   ├── ScoringService.ts
│   │   ├── WaitlistService.ts
│   │   └── RegistrationService.ts
│   ├── websocket/
│   │   └── WebSocketService.ts
│   └── routes/
│       └── registrationRoutes.ts
```

## Step 4: Integrate with Your Express Server

```typescript
// In your existing server file (e.g., server.ts or app.ts)

import { createServer } from 'http';
import { createRegistrationRouter } from './routes/registrationRoutes';
import { WebSocketService } from './websocket/WebSocketService';

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize WebSocket
const wsService = new WebSocketService(httpServer);

// Add registration routes
app.use('/api/registration', createRegistrationRouter(prisma, wsService));

// Use httpServer instead of app.listen()
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Step 5: Frontend Integration

### Install Socket.IO Client

```bash
npm install socket.io-client
```

### Add Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/registration
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### Copy Frontend Files

```
your-nextjs-app/
├── hooks/
│   └── useRegistrationSocket.ts
├── services/
│   └── registrationAPI.ts
├── components/
│   ├── LiveClassroomView.tsx
│   └── CourseBookingCard.tsx
```

### Use in Your Pages

```tsx
// app/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { CourseBookingCard } from '@/components/CourseBookingCard';
import { registrationAPI } from '@/services/registrationAPI';

export default function BookingsPage() {
  const [preferences, setPreferences] = useState([]);
  const studentId = 'current-student-id'; // From your auth

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await registrationAPI.getPreferences(studentId);
      setPreferences(prefs);
    };
    loadPreferences();
  }, [studentId]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Course Bookings</h1>
      
      <div className="space-y-4">
        {preferences.map((pref) => (
          <CourseBookingCard
            key={pref.course.id}
            course={pref.course}
            studentId={studentId}
            priority={pref.priority}
            matchReason={pref.matchReason}
          />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// app/liveview/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { LiveClassroomView } from '@/components/LiveClassroomView';

export default function LiveViewPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('course');
  const studentId = 'current-student-id'; // From your auth

  if (!courseId) {
    return <div>No course selected</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <LiveClassroomView
        courseId={courseId}
        studentId={studentId}
        onSeatBooked={(seat) => {
          console.log('Booked seat:', seat);
        }}
      />
    </div>
  );
}
```

## Step 6: Connect Your Recommendation System

When your AI recommendation system shortlists courses for a student, save the preferences:

```typescript
// After your recommendation system generates course suggestions
const recommendations = await yourRecommendationSystem.getRecommendations(studentId);

// Save to the registration system
await registrationAPI.setPreferences(studentId, recommendations.map((rec, index) => ({
  courseId: rec.courseId,
  priority: index + 1,
  matchReason: rec.reason, // e.g., "Matches your interest in AI and Machine Learning"
})));
```

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/registration/courses` | Get all courses with availability |
| GET | `/api/registration/classroom/:courseId` | Get seat map for a course |
| POST | `/api/registration/apply` | Apply for a course |
| POST | `/api/registration/book-seat` | Book a specific seat |
| POST | `/api/registration/drop` | Drop a course |
| GET | `/api/registration/student/:id/status` | Get student's registration status |
| GET | `/api/registration/waitlist/:courseId` | Get course waitlist |
| POST | `/api/registration/preferences` | Set student preferences |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `{ studentId }` | Authenticate connection |
| `subscribe:course` | `{ courseId }` | Subscribe to course updates |
| `unsubscribe:course` | `{ courseId }` | Unsubscribe from course |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `course:update` | WSMessage | Course state change |
| `SEAT_BOOKED` | `{ seatNumber, studentId, studentName }` | Seat was booked |
| `SEAT_RELEASED` | `{ seatNumber, newStudentId? }` | Seat was released |
| `WAITLIST_UPDATED` | `{ waitlistSize, topCandidates }` | Waitlist changed |
| `BOOKING_STATUS_CHANGED` | `{ status }` | Booking status changed |

## Scoring Configuration

The scoring system can be configured by modifying weights in `ScoringService.ts`:

```typescript
const DEFAULT_WEIGHTS = {
  gpaWeight: 0.35,      // Academic performance
  interestWeight: 0.30, // Interest match
  timeWeight: 0.20,     // Early application bonus
  yearWeight: 0.15,     // Year appropriateness
};
```

## How It Works

### Registration Flow

1. **Student sees recommended courses** (from your AI system)
2. **Booking OPEN + Seats Available**: Student can manually select a seat
3. **Booking OPEN + No Seats**: Student joins waitlist with auto-register option
4. **Booking CLOSED**: Student joins waitlist, waits for allocation
5. **Dropout occurs**: Top waitlisted student auto-enrolled

### Priority Scoring

When multiple students compete for limited seats:

```
compositeScore = (0.35 × GPA) + (0.30 × InterestMatch) + (0.20 × TimeBonus) + (0.15 × YearFit)
```

- **GPA Score**: Normalized GPA (0-1)
- **Interest Score**: Jaccard similarity between student interests and course keywords
- **Time Score**: Exponential decay favoring early applications
- **Year Score**: How well student's year matches course level

### Real-time Updates

All seat changes are broadcast via WebSocket:
- When a student books a seat → All viewers see it turn occupied
- When a student drops → Seat opens OR auto-fills from waitlist
- Waitlist position updates in real-time

## Testing

```bash
# Run the backend
cd your-server
npm run dev

# In another terminal, run the frontend
cd your-nextjs-app
npm run dev

# Open multiple browser tabs to see real-time sync
```

## Troubleshooting

### WebSocket not connecting
- Check CORS settings in WebSocketService
- Ensure `NEXT_PUBLIC_WS_URL` is correct
- Check if backend server is running

### Seats not updating in real-time
- Verify WebSocket connection (check browser console)
- Ensure you've called `subscribeToCourse(courseId)`

### Waitlist not working
- Check if student meets prerequisites
- Verify scoring weights are configured
- Check database for WaitlistEntry records
