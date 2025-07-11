# "Adept" AI Data Extractor (v1.1)

Adept is a multi-tenant, AI-powered application designed to ingest user-uploaded files (images, audio, video, PDFs, Excel), use a sophisticated AI agent to extract structured data, and provide a human-in-the-loop interface for refining the results.

This project serves as the core infrastructure for the Adept application, built on a modern, type-safe, and scalable technology stack.

---

## Core Technologies & Architecture

| Category                  | Technology                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Framework**             | [Next.js](https://nextjs.org/) 15.3.3 (App Router)                            |
| **API Layer**             | [tRPC](https://trpc.io/) for end-to-end type-safe APIs                        |
| **Database**              | [PostgreSQL](https://www.postgresql.org/)                                     |
| **ORM**                   | [Prisma](https://www.prisma.io/) for type-safe database access and migrations |
| **Authentication**        | [Lucia Auth](https://lucia-auth.com/) for multi-tenant user management        |
| **Job Orchestration**     | [Inngest](https://www.inngest.com/) for reliable, long-running AI tasks       |
| **AI Agent**              | [@inngest/agent-kit](https://www.inngest.com/docs/features/ai-agents)         |
| **LLM**                   | [OpenAI GPT-4 Turbo](https://openai.com/)                                     |
| **Execution Environment** | [E2B Sandbox](https://www.e2b.dev/) for isolated code execution               |
| **Code Quality**          | ESLint, Prettier, Husky, lint-staged                                          |
| **Deployment**            | Vercel (TBD)                                                                  |

---

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- Node.js (v18.18 or later)
- Docker and Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/xBausx/ai-data-extractor.git
cd ai-data-extractor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file by copying the example. This file will store your database connection string and other secrets.

```bash
cp .env.example .env
```

Note: The `.env` file is included in `.gitignore` and should never be committed to the repository.

### 4. Start the Database

This command starts a PostgreSQL database container in the background using Docker.

```bash
docker-compose up -d
```

### 5. Run Database Migrations

Prisma uses a migration history to manage your database schema. Run the following command to apply any pending migrations.

```bash
npx prisma migrate dev
```

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

This project follows a modular monolith architecture. The core logic is organized by feature domains within the src/modules/ directory. \* _src/app/_: Next.js App Router pages and API routes. \* _src/lib/_: Core utilities, including the Prisma client (db.ts), tRPC setup, and Zod-validated environment variables. \* _src/modules/_: Contains all business logic, separated by domain (e.g., auth/, jobs/, stores/). \* _src/services/_: Centralizes third-party SDK initializations (e.g., OpenAI, S3, E2B). \* _prisma/_: Contains your Prisma schema and migration history.

## Code Quality

This repository is configured with ESLint, Prettier, and Husky to enforce a consistent code style. A pre-commit hook is set up to automatically format and lint staged files before they are committed.

```bash
**Action Item:** Before proceeding, create the `.env.example` file mentioned in the README. Simply copy your `.env` file but replace your secret values with placeholders. For now, it will just contain the database URL.
```

## .env.example

```bash
DATABASE_URL="postgresql://adept:adeptpassword@localhost:5432/adeptdb?schema=public"
```
