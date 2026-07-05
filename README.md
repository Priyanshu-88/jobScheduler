# Job Scheduler Platform

A production-inspired distributed job scheduling platform built with NestJS (API), SQLite (Database), and plain HTML/CSS/JS (Dashboard UI). It features robust worker management, queues with concurrency limits, real-time metrics, and automatic dead letter queueing.

## Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

## Setup Instructions

### 1. Install Dependencies
Install all required Node modules for the entire monorepo:
```bash
npm install
```

### 2. Database Initialization & Seeding
The platform uses Prisma with SQLite. You need to apply migrations and seed the database with initial users and sample data:
```bash
npm run db:migrate
npm run db:seed
```

### 3. Start the API Server
Start the core backend API and serve the dashboard UI:
```bash
npm run dev:api
```
- **Dashboard UI**: Available at [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs**: Available at [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### 4. Start the Worker Process
For jobs to actually be processed, you must start the worker service in a separate terminal:
```bash
npm run dev:worker
```
*(You can start multiple worker instances in different terminals to simulate a distributed fleet)*

## Default Seed Users
Use these credentials to log in to the Dashboard if you don't want to register a new account:
- **Admin**: `admin@jobscheduler.dev` / `password123`
- **Member**: `dev@jobscheduler.dev` / `password123`
