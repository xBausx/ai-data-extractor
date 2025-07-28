# Adept AI Extractor API

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Inngest](https://img.shields.io/badge/Inngest-3.x-brightgreen?style=for-the-badge)](https://www.inngest.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-darkblue?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

Adept is an API-first, AI-powered service for extracting structured data from images. It provides a robust, asynchronous workflow for initiating extraction jobs, refining results through conversational input, and preparing the final structured data for integration with external systems.

This repository contains the full infrastructure stack required to operate the API server, job orchestrator, and AI execution environment.

---

## Architecture Overview

Adept employs a modern, asynchronous architecture to reliably process long-running AI tasks without blocking client operations.

### Core Workflow

1. **Job Submission**  
   A client initiates a job via `POST /api/jobs/extract` with an image URL.

2. **Immediate Response**  
   The API stores a `pending` job in the database, triggers an asynchronous task via Inngest, and returns a `202 Accepted` response with a `jobId`.

3. **Asynchronous Processing**  
   The Inngest function invokes a secure E2B sandbox to run a Python script that performs AI-powered extraction.

4. **Result Storage**  
   On completion, the database is updated with the extracted data and a `completed` or `failed` status.

5. **Client Polling**  
   The client polls a `GET` endpoint using the `jobId` to retrieve the job status and extracted result.

---

## Technology Stack

| Category              | Technology                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Framework**         | [Next.js](https://nextjs.org/) (App Router)                                                            |
| **Public API**        | [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) |
| **API Documentation** | [Swagger UI](https://swagger.io/tools/swagger-ui/), [OpenAPI](https://www.openapis.org/)               |
| **Database**          | [PostgreSQL](https://www.postgresql.org/) (via Docker)                                                 |
| **ORM**               | [Prisma](https://www.prisma.io/)                                                                       |
| **Job Orchestration** | [Inngest](https://www.inngest.com/)                                                                    |
| **AI Execution**      | [E2B Code Interpreter](https://www.e2b.dev/)                                                           |
| **LLM Provider**      | [OpenAI GPT-4o](https://openai.com/)                                                                   |
| **Auth (Web UI)**     | [Lucia Auth](https://lucia-auth.com/)                                                                  |
| **Code Quality**      | ESLint, Prettier, Husky, lint-staged                                                                   |

---

## Getting Started

### Prerequisites

- Node.js v18.18 or higher
- Docker and Docker Compose

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd adept-ai-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment files:

```bash
cp .env.example .env
cp .env.local.example .env.local
```

Edit `.env.local` and provide your credentials and keys (e.g., OpenAI, E2B).

### 4. Start the PostgreSQL Database

```bash
docker-compose up -d
```

### 5. Run Prisma Migrations

```bash
npx prisma migrate dev
```

### 6. Start the Development Server

```bash
npm run dev
```

Access the API and Swagger UI at: [http://localhost:3000](http://localhost:3000)

---

## API Usage

### Swagger UI

Once the server is running, the Swagger UI will be available at the root route:
http://localhost:3000/

This provides an interactive interface to explore and test the API.

---

### Quick Start via `curl`

#### 1. Submit an Extraction Job

```bash
curl -X POST http://localhost:3000/api/jobs/extract \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/supermarket-grocery-flyer-template-design-62d4bac98ec3e801492f00d5cac7df1f_screen.jpg?ts=1698450919"
  }'
```

Example response:

```json
{
  "jobId": "01K10AJ2H6JG8GHBRG4TN1X4KN"
}
```

#### 2. Poll for Job Result

```bash
curl http://localhost:3000/api/jobs/01K10AJ2H6JG8GHBRG4TN1X4KN
```

If processing is complete, the API returns the final extracted data.

---

## Project Structure

src/
├── app/
│ ├── api/ # Public REST API (Next.js Route Handlers)
│ └── chat/ # Chat interface UI
├── components/ # Shared React components
├── lib/ # Utilities: Prisma client, types, etc.
├── modules/ # Core business logic (AI logic, Inngest functions)
├── services/ # External service initializations (e.g., E2B)
prisma/ # Prisma schema and migrations

---

## Code Quality & Standards

- **Linting:** Enforced with ESLint.
- **Formatting:** Handled by Prettier.
- **Pre-commit Hooks:** Managed via Husky and lint-staged for clean code at every commit.

---

## License

This project is licensed under your organization's default license. Please refer to the `LICENSE` file if available.
