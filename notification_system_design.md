# Campus Notifications Microservice

## Stage 1: API Design & Real-Time Mechanism

### Core Actions
1. **Fetch Notifications**: Retrieve all notifications for the logged-in user.
2. **Mark as Read**: Mark a specific notification as read.
3. **Mark All as Read**: Mark all notifications for the user as read.

### REST API Endpoints

#### 1. Fetch Notifications
- **Endpoint**: `GET /api/v1/notifications`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:18Z"
    }
  ]
}
```

#### 2. Mark Notification as Read
- **Endpoint**: `PATCH /api/v1/notifications/:id/read`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `204 No Content`

#### 3. Mark All as Read
- **Endpoint**: `PATCH /api/v1/notifications/read-all`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `204 No Content`

### Real-Time Mechanism
For real-time notifications, **Server-Sent Events (SSE)** or **WebSockets** should be used. Since notifications are mostly unidirectional (Server -> Client), SSE is a lightweight, HTTP-native mechanism perfectly suited for this. The client connects to `GET /api/v1/notifications/stream` and the server pushes events continuously.

---

## Stage 2: Database Storage & Schema

### Persistent Storage Recommendation
**PostgreSQL** (Relational Database) is highly recommended. Notifications are inherently structured, require strict integrity, and are often queried with complex filtering (e.g., finding specific types or unread status for specific users). PostgreSQL excels at concurrent read/write operations and advanced indexing.

### Database Schema
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    student_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Data Volume Problems & Solutions
As data volume increases to millions of rows, querying unread notifications per student will become slow (Full Table Scans).
**Solutions:**
1. **Indexing**: Add a composite index on `(student_id, is_read, created_at DESC)`.
2. **Partitioning**: Partition the `notifications` table by `created_at` (e.g., monthly). Older partitions can be archived or dropped.
3. **Caching**: Use a Redis cache layer for unread counts and recent notifications.

### Queries based on Stage 1
```sql
-- Fetch Notifications
SELECT * FROM notifications WHERE student_id = ? ORDER BY created_at DESC LIMIT 50;

-- Mark as Read
UPDATE notifications SET is_read = true WHERE id = ? AND student_id = ?;

-- Mark All as Read
UPDATE notifications SET is_read = true WHERE student_id = ? AND is_read = false;
```

---

## Stage 3: Query Optimization

### Query Analysis
The query is **functionally accurate**, but it is **slow** because, without an index, the database must perform a "Full Table Scan" across all 5,000,000 rows to find unread notifications for student 1042, and then sort them in memory.

### Required Changes & Cost
Adding a composite index is required.
**Computation Cost**: A full table scan is O(N). With a composite B-Tree index, finding the records drops to O(log N).
**Why indexing EVERY column is bad**: While adding indexes speeds up `SELECT` queries, it drastically slows down `INSERT` and `UPDATE` operations because the database must update every single index when a row changes. It also wastes massive amounts of disk storage.

### Optimized Query (Placement in last 7 days)
```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE notification_type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Fetch on Page Load Performance

### Solution
The database is overwhelmed because every page load triggers a heavy DB query. The solution is to introduce a **Caching Layer** using **Redis**.

### Strategy
1. **Cache Read-Through**: When a student loads a page, check Redis for a key like `notifications:unread:<studentID>`. If it exists, return it instantly.
2. **Cache Invalidations**: If the cache misses, fetch from PostgreSQL and store the result in Redis with a TTL (Time-To-Live). When a new notification is generated, or a user marks one as read, the cache must be explicitly invalidated or updated.

### Tradeoffs
- **Pros**: Sub-millisecond read times, protecting the database from repetitive queries, and vastly improved user experience.
- **Cons**: Increased system complexity (cache invalidation is notoriously difficult), potential for stale data (eventual consistency), and additional infrastructure costs for hosting Redis.

---

## Stage 5: Bulk Notification (Notify All)

### Shortcomings of the Pseudocode
1. **Synchronous & Blocking**: The `for` loop executes sequentially. Sending 50,000 emails synchronously will block the main thread, causing request timeouts.
2. **Partial Failures**: If the email API fails at index 200, the loop crashes, and 49,800 students never receive their notification.
3. **Coupling**: The DB insert and Email sending happen synchronously in the same request cycle. They **should not happen together**. Database writes are fast, but third-party Email APIs are slow and volatile.

### Redesign (Event-Driven Architecture)
We must decouple the heavy processing using a **Message Queue** (e.g., RabbitMQ or Kafka). The API simply creates an event, and background workers process it reliably with retries.

### Revised Pseudocode
```python
function notify_all(student_ids: array, message: string):
    # API immediately returns success
    push_to_message_queue("bulk_notification_job", {student_ids, message})

# --- Background Worker Process ---
function process_bulk_job(job):
    # Chunking to process in parallel
    for chunk in chunk_array(job.student_ids, 1000):
        push_to_message_queue("process_chunk", {chunk, job.message})

function process_chunk(chunk_job):
    # Batch insert to DB (extremely fast)
    batch_save_to_db(chunk_job.chunk, chunk_job.message)
    
    # Broadcast to connected WebSockets
    broadcast_to_app(chunk_job.chunk, chunk_job.message)
    
    # Async email dispatch (allows independent retries on failure)
    for student_id in chunk_job.chunk:
        try:
            send_email_async(student_id, chunk_job.message)
        except EmailAPIError:
            push_to_message_queue_with_delay("retry_email", {student_id, chunk_job.message})
```

---

## Stage 6: Priority Inbox Implementation

### Maintaining Top 10 Efficiently
To maintain the top 10 efficiently as a continuous stream of new notifications arrive, we use a **Min-Heap (Priority Queue)** data structure of size `N = 10`. 

1. **Weighting Formula**: Priority is determined by checking Weight `(Placement > Result > Event)`. If weights are equal, we fallback to Recency.
2. **O(log N) Efficiency**: When a new notification arrives:
   - If the heap has less than 10 items, we push it in.
   - If the heap has 10 items, we compare the new notification's priority with the **minimum** priority currently in the heap (the root). If the new priority is greater, we pop the root and insert the new notification. 
   - This ensures we never sort the entire array (which is O(M log M)), reducing insertion time to **O(log 10)** which is extremely fast and scalable.
