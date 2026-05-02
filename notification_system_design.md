# Campus Notifications Microservice

## Stage 1: API Design & Real-Time Mechanism

### Endpoints

**1. Fetch Notifications**
- `GET /api/v1/notifications`
- Headers: `Authorization: Bearer <token>`
- Response:
```json
{
  "notifications": [
    {
      "id": "123",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:18Z"
    }
  ]
}
```

**2. Mark Notification as Read**
- `PATCH /api/v1/notifications/:id/read`
- Headers: `Authorization: Bearer <token>`
- Response: `204 No Content`

**3. Mark All as Read**
- `PATCH /api/v1/notifications/read-all`
- Headers: `Authorization: Bearer <token>`
- Response: `204 No Content`

### Real-Time Mechanism
For real-time delivery, I'd suggest using Server-Sent Events (SSE) or WebSockets. Since we're mostly just pushing data from the server to the client, SSE is simpler to set up and runs over standard HTTP.

---

## Stage 2: Database Storage & Schema

### DB Choice
PostgreSQL is probably the best fit here. Notifications are structured data and we'll need to do a lot of querying and filtering (like checking read status for specific students).

### Schema
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

### Handling Data Volume
As the table grows, full table scans will kill performance. We can fix this by:
1. Adding a composite index on `(student_id, is_read, created_at DESC)`.
2. Partitioning the table by month so older notifications don't slow down active queries.

### Queries
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

### Why is it slow?
The query works, but it's slow because there's no index. The DB has to scan all 5 million rows to find the unread ones for student 1042. 

### The Fix
We just need a composite index. 
**Why not index every column?** Because every time you `INSERT` or `UPDATE` a row, the DB has to update all those indexes. It slows down writes massively and wastes disk space.

### Optimized 7-Day Query
```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE notification_type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Fetch on Page Load Performance

### Solution
If the DB is getting overwhelmed by page refreshes, we need a caching layer like Redis.

### Strategy
We can cache the unread counts and recent notifications in Redis (`notifications:unread:<studentID>`). When a user loads the page, we hit Redis first. If it's not there, we fetch from Postgres and save it to Redis.

### Tradeoffs
- **Pros**: Much faster response times and saves the DB from crashing under load.
- **Cons**: Cache invalidation is tricky. You have to make sure Redis stays in sync when new notifications are created or marked as read.

---

## Stage 5: Bulk Notification (Notify All)

### Problems with the Pseudocode
1. The `for` loop is synchronous. Sending 50k emails in a single request loop will block the thread and eventually timeout.
2. If the email API throws an error at student #200, the loop crashes and the remaining 49,800 students get nothing.
3. DB inserts and external email APIs shouldn't be tied together in the same process.

### Redesign
We should use an event-driven setup with a message queue like RabbitMQ or Kafka.

### Better Pseudocode
```python
function notify_all(student_ids, message):
    # Just push the job and return success immediately
    push_to_queue("bulk_job", {student_ids, message})

# Background worker
function process_bulk_job(job):
    # Split into smaller chunks
    for chunk in chunk_array(job.student_ids, 1000):
        push_to_queue("process_chunk", {chunk, job.message})

function process_chunk(data):
    batch_insert_db(data.chunk, data.message)
    broadcast_websockets(data.chunk, data.message)
    
    # Send emails async so failures can be retried individually
    for id in data.chunk:
        try:
            send_email_async(id, data.message)
        except Error:
            push_to_queue("retry_email", {id, data.message})
```

---

## Stage 6: Priority Inbox Implementation

### Maintaining Top 10
To keep track of the top 10 notifications efficiently as new ones stream in, the best data structure is a Min-Heap (Priority Queue) with a fixed size of 10. 

- We calculate a score based on weight (`Placement` > `Result` > `Event`) and recency.
- When a new notification comes in, if the heap is full, we compare it to the root (the lowest priority item in the top 10). If the new one is higher, we swap it out.
- This gives us O(log 10) insertion time, which is basically O(1), instead of having to sort the entire list of notifications.
