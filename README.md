# QuiqImage

A Quiq Labs web application built with the Quiq Labs tech stack: Next.js, TypeScript, Prisma, PostgreSQL, Tailwind CSS, and Docker.

## Prerequisites

- [Node.js 20+](https://nodejs.org/) (via [nvm](https://github.com/nvm-sh/nvm) on Mac, [nvm-windows](https://github.com/coreybutler/nvm-windows) on Windows)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/) with Claude extension
- [Git](https://git-scm.com/)

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/YOUR-ORG/quiqimage.git
cd quiqimage

# 2. Set up environment variables
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Install dependencies
npm install

# 5. Create the database and run migrations
npx prisma migrate dev --name init

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## Project Structure

```
quiqimage/
├── prisma/
│   └── schema.prisma          # Database schema (source of truth)
├── src/
│   ├── app/                   # Next.js App Router pages and layouts
│   │   ├── api/               # API route handlers
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # Reusable React components
│   ├── lib/                   # Shared utilities (Prisma client, etc.)
│   └── types/                 # Shared TypeScript types
├── tests/                     # Test files
├── public/                    # Static assets
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Local PostgreSQL
└── .github/workflows/ci.yml  # CI/CD pipeline
```

## Database

The database schema is defined in `prisma/schema.prisma`. To make changes:

```bash
# Edit prisma/schema.prisma, then:
npx prisma migrate dev --name describe-your-change

# To view/edit data in the browser:
npx prisma studio
```

## Docker

### Local Development

Docker Compose runs PostgreSQL locally. The app itself runs on Node.js for fast hot-reload:

```bash
docker compose up -d      # Start PostgreSQL
docker compose down        # Stop PostgreSQL
docker compose down -v     # Stop and delete all data
```

### Production Build

The Dockerfile creates a production-ready image using a multi-stage build:

```bash
docker build -t quiqimage .
docker run -p 3000:3000 -e DATABASE_URL="your-production-db-url" quiqimage
```

## Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "Add your feature"`
3. Push and open a PR: `git push -u origin feature/your-feature`
4. CI runs automatically — lint, typecheck, test, build
5. Get a review, then squash and merge to `main`
6. Production deploys automatically

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | See `.env.example` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js sessions | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL for NextAuth.js | `http://localhost:3000` |

---

Built by [Quiq Labs](https://quiqlabs.com)
