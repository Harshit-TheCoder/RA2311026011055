# Notification System Design

## Architecture Overview
The notification system is designed to be a highly available, decoupled architecture using an Event-Driven microservices approach. This allows different parts of the application (e.g., Vehicle Maintenance Scheduler, User Management) to send notifications reliably without blocking core processes.

## Components

### 1. Notification Backend (`notification_app_be`)
- **Role:** The core service handling notification requests, processing templates, and communicating with external providers (e.g., Twilio for SMS, SendGrid for Email, Firebase for Push).
- **Framework:** Node.js with Express and TypeScript.
- **API Endpoints:**
  - `POST /api/notify` - Accepts notification requests (user ID, message, channel).

### 2. Message Queue (RabbitMQ / Kafka)
- **Role:** Buffers incoming notification requests to ensure reliability during traffic spikes.
- **Reasoning:** Prevents the backend from being overwhelmed and allows for retries in case external providers are down. 

### 3. Database Layer (PostgreSQL / MongoDB)
- **Role:** Stores user preferences (e.g., opt-in/opt-out for SMS vs. Email), notification templates, and an audit log of sent notifications.

### 4. Logging Middleware (`logging_middleware`)
- **Role:** A shared library used by the Notification Backend and other services (like the Cron job) to centrally log events.
- **Capabilities:** Sends structured logs (stack, level, package, message) to the centralized evaluation test server via an authenticated API.

## Data Flow
1. **Trigger:** An internal service (e.g., `vehicle_maintence_scheduler`) identifies a need for a notification (e.g., a vehicle needs maintenance).
2. **Request:** The service makes an HTTP request to `notification_app_be` OR publishes an event to the Message Queue.
3. **Queue Processing:** The Notification Backend consumes the event from the queue.
4. **Validation & Preferences:** The backend checks the user's notification preferences from the Database.
5. **Delivery:** The backend calls the appropriate 3rd party provider API (e.g., Twilio/SendGrid).
6. **Logging:** At each step (received, processed, delivered, or failed), the `logging_middleware` is invoked to log the state to the central observability server.
