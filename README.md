# Afford Medicals - Backend Platform

An industry-grade, modular Node.js backend ecosystem designed to handle complex algorithmic scheduling, system health monitoring, and scalable notification processing. 

## 📖 Problem Statement
The objective of this project is to build a robust backend architecture that seamlessly integrates multiple microservices while adhering to strict operational constraints. The platform requires solving complex mathematical optimization problems (specifically, a 0/1 Knapsack algorithm for vehicle maintenance scheduling) to maximize operational impact within strict resource constraints. Additionally, the system must interact securely with an external Evaluation API using a custom, centralized logging middleware that enforces strict payload schemas and character limits.

## 🎯 Requirements
- **Monorepo Architecture**: Utilize npm workspaces to manage decoupled but interdependent backend services.
- **Centralized Logging**: A strict middleware that intercepts system logs, ensures they do not exceed 48 characters, enforces specific log levels (`backend`, `error`, `handler`), and securely transmits them to an external evaluation server via Bearer token authentication.
- **Algorithmic Optimization**: Implement a Dynamic Programming algorithm to schedule vehicle maintenance by maximizing the "Impact" score without exceeding the depot's "Mechanic Hours" budget.
- **Scalable Notification Design**: Design a highly scalable Campus Notification Microservice capable of handling millions of records, real-time WebSocket delivery, RabbitMQ bulk processing, and O(log N) Priority Inbox sorting.

## 💻 Tech Stack
- **Runtime**: Node.js
- **Language**: TypeScript (Strict typing enabled)
- **Framework**: Express.js (REST APIs)
- **Task Scheduling**: `node-cron`
- **HTTP Client**: Axios
- **Architecture**: NPM Workspaces (Monorepo)

## 🏗️ System Architecture & Workflow
The project is divided into distinct, purpose-built workspaces that communicate locally and via the network:
1. **Bootstrapping (`setup_auth`)**: Before any service starts, the authentication script handshakes with the Evaluation API, registers the user, and securely caches short-lived JWT credentials into a local `auth.json` vault.
2. **Middleware Interception**: All services import the local `logging_middleware` package. Standard `console.log` is strictly prohibited. The middleware attaches the `auth.json` token to every log event and broadcasts it to the evaluation server.
3. **Microservice Execution**: 
   - The **Notification App** boots an Express server to listen for incoming client requests.
   - The **Maintenance Scheduler** boots a daemonized node-cron worker to run automated tasks every minute.
   - The **Vehicle Scheduling** worker fetches external API constraints, runs the O(N*W) Knapsack matrix in memory, and submits the optimized schedule back via the middleware.

## 📦 Features & Modules
* **`logging_middleware`**: The central nervous system for auditability.
* **`notification_app_be`**: Express server featuring a custom `MinHeap` data structure that maintains a real-time Top 10 Priority Inbox (Weight + Recency) in `O(log N)` time.
* **`vehicle_maintence_scheduler`**: Background cron worker ensuring high availability.
* **`vehicle_scheduling`**: DP algorithmic engine calculating optimal maintenance combinations.
* **`notification_system_design.md`**: Theoretical architecture documentation for scaling databases to millions of users via PostgreSQL indexing, Redis caching, and Event-Driven architecture.

## 🚀 Installation & Setup

1. **Install Dependencies**
   Run the following command at the root to install all workspace dependencies:
   ```bash
   npm install
   ```

2. **Configure Authentication**
   Open `scripts/setup_auth.ts` and ensure the `USER_DETAILS` object contains your accurate information.
   Run the setup script to generate your `auth.json` credentials:
   ```bash
   npm run setup-auth
   ```

3. **Build the Project**
   Compile all TypeScript workspaces simultaneously:
   ```bash
   npm run build
   ```

4. **Run the Services**
   You can run each microservice independently via the root package scripts:
   - **Notification Server**: `npm run start:backend`
   - **Cron Scheduler**: `npm run start:scheduler`
   - **Knapsack Algorithm**: `npm run start:scheduling`
   - **Priority Inbox Output**: `npm run start:priority-inbox`

---

## 📐 System Design Plan
Detailed documentation for the Campus Notification System scaling strategy (Stages 1 through 6) is located in [notification_system_design.md](./notification_system_design.md). It includes:
- REST API Schemas
- PostgreSQL Schema & Composite Indexing Strategies
- Redis Read-Through Caching concepts
- Asynchronous RabbitMQ Worker pseudocode
- Min-Heap algorithm documentation

---

## 📸 Results & Screenshots

*(Place your Postman Evaluation API screenshots below to prove end-to-end functionality)*

### 1. Registration (`/register`)
![Registration Screenshot](images\api_screenshots\registration\registration.png)

### 2. Authentication (`/auth`)
![Authentication Screenshot](images\api_screenshots\authentication\authentication.png)

### 3. Depots Payload (`/depots`)
![Depots API](images\api_screenshots\depots\depots.png)

### 4. Vehicles Payload (`/vehicles`)
![Vehicles API](images\api_screenshots\vehicle\vehicle1.png)
![Vehicles API](images\api_screenshots\vehicle\vehicle2.png)
![Vehicles API](images\api_screenshots\vehicle\vehicle3.png)

### 5. Priority Inbox Results
*(Screenshot of the terminal running `npm run start:priority-inbox`)*
![Priority Inbox Output](placeholder_path/priority_inbox.png)

### 6. Notification (`/notification`)
![Notifications API](images\api_screenshots\notification\notification1.png)
![Notifications API](images\api_screenshots\notification\notification1.png)
