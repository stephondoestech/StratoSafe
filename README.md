# StratoSafe
<!-- markdownlint-disable MD033 -->

<p align="center">
  <img src="https://via.placeholder.com/200x200.png?text=StratoSafe" alt="StratoSafe Logo" width="200" height="200">
</p>

<p align="center">
  <strong>Secure Your Files in the Cloud</strong>
</p>

## What is StratoSafe?

StratoSafe is a modern, secure cloud storage solution that allows individuals and teams to safely store, manage, and share files online. Built with TypeScript, React, and Node.js, it provides an intuitive interface for file management while maintaining robust security through JWT authentication.

### Key Features

- **Secure Authentication**: User accounts with email/password login protected by JWT tokens
- **File Management**: Easily upload, download, organize, and remove files
- **Responsive Design**: Mobile-friendly interface built with Material UI
- **Modern Architecture**: Monorepo structure with TypeScript for both frontend and backend
- **Containerized Deployment**: Docker-ready for easy deployment in any environment

Whether you're looking for personal cloud storage or a team collaboration tool, StratoSafe offers the perfect balance of security, simplicity, and performance.

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

## Features

- **User Authentication:** Secure login and registration with JWT and bcrypt
- **File Management:** Easily upload, download, and manage your files
- **Privacy-Focused:** Your files are accessible only to you
- **Modern UI:** Clean, responsive design with Material UI
- **Easy Deployment:** Docker ready for quick deployment
- **Mobile-Friendly:** Access your files on any device
- **Dark Mode:** Full dark mode support for improved user experience and reduced eye strain

## Demo

Login Page:

![StratoSafe Login Page](./frontend/assets/demo_login.png)

File Upload Page:

![StratoSafe File Edit](./frontend/assets/demo_file_upload.png)

Profile Edit Page:

![StratoSafe Profile Edit](./frontend/assets/demo_edit_profile.png)

### Security Settings Pages

MFA Regisration Page:

![StratoSafe MFA Page](./frontend/assets/demo_mfa.png)

Change Password Page: 

![StratoSafe Change Password Page](./frontend/assets/demo_change_password.png)

## Quick Start

The fastest way to get StratoSafe running is with Docker:

```bash
# Clone the repository
git clone https://github.com/stephondoestech/stratosafe.git
cd stratosafe

# Create environment file
cat > .env << 'EOF'
PORT=3001
JWT_SECRET=supersecretkey123
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=stratosafe_user
DB_PASSWORD=stratosafe_password
DB_DATABASE=stratosafe
EOF

# Build and start with Docker
make docker
```

Then open http://localhost:3000 in your browser.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Yarn](https://yarnpkg.com/)
- [Docker & Docker Compose](https://docs.docker.com/compose/install/) (for containerized deployment)
- [PostgreSQL](https://www.postgresql.org/) (if running locally without Docker)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/stephondoestech/stratosafe.git
   cd stratosafe
   ```

2. **Install dependencies:**
   ```bash
   make install
   # or
   yarn install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory with the following content:
   ```
   PORT=3001
   JWT_SECRET=your_secure_secret_key
   DB_HOST=127.0.0.1  # Use 'postgres' for Docker
   DB_PORT=5432
   DB_USERNAME=your_db_username
   DB_PASSWORD=your_db_password
   DB_DATABASE=stratosafe
   ```

4. **Build the project:**
   ```bash
   make build
   # or
   yarn build
   ```

## Usage

### Running Locally

```bash
make run
# or
yarn start
```

This will start both the backend server and the frontend development server concurrently.

- Backend API will be available at: http://localhost:3001
- Frontend will be available at: http://localhost:3000

### Running with Docker

```bash
# Option 1: Using the Makefile (Recommended)
make docker

# Option 2: Using Docker Compose directly
docker-compose up --build

# Run in detached mode (background)
docker-compose up --build -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

This will build and start all services using Docker Compose:

1. **PostgreSQL database** - Stores user accounts and file metadata
2. **Backend API** - Node.js server running on port 3001
3. **Frontend** - React application served on port 3000

All data is persisted in Docker volumes, so you won't lose information when containers restart.

### Makefile Commands

- `make install` - Install dependencies
- `make build` - Build the project
- `make run` - Run the project locally
- `make docker` - Run the project with Docker

## Tech Stack

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Express](https://expressjs.com/)** - Web framework
- **[TypeORM](https://typeorm.io/)** - ORM for database interaction
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Frontend
- **[React](https://reactjs.org/)** - UI library
- **[Material UI](https://mui.com/)** - Component library
- **[React Router](https://reactrouter.com/)** - Routing
- **[Axios](https://axios-http.com/)** - HTTP client

### Infrastructure
- **[Docker](https://www.docker.com/)** - Containerization
- **[Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)** - Monorepo management
- **[Nginx](https://nginx.org/)** - Web server for frontend (in Docker)

## Project Structure

```
StratoSafe/
├── .github/
│   ├── CODEOWNERS                        # GitHub code ownership configuration
│   └── workflows/
│       ├── build-test.yml                # Original build and test workflow
│       ├── build-test-mfa.yml            # New MFA-aware build and test workflow
│       ├── docker-publish.yml            # Docker build and publish workflow
│       └── lint.yml                      # Linting workflow
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── fileController.ts         # File upload and management
│   │   │   ├── mfaController.ts          # New MFA operations controller
│   │   │   └── userController.ts         # User auth (updated for MFA)
│   │   │
│   │   ├── middlewares/
│   │   │   └── authMiddleware.ts         # JWT authentication middleware
│   │   │
│   │   ├── models/
│   │   │   ├── File.ts                   # File entity model
│   │   │   └── User.ts                   # User entity model (updated for MFA)
│   │   │
│   │   ├── routes/
│   │   │   ├── fileRoutes.ts             # File API routes
│   │   │   └── userRoutes.ts             # User API routes (updated for MFA)
│   │   │
│   │   ├── services/
│   │   │   └── MfaService.ts             # New TOTP & backup code service
│   │   │
│   │   ├── types/
│   │   │   └── express-multer.d.ts       # TypeScript definitions for multer
│   │   │
│   │   ├── data-source.ts                # TypeORM database connection
│   │   └── server.ts                     # Express server entry point
│   │
│   ├── Dockerfile                        # Updated for MFA dependencies
│   ├── init-db.sh                        # Database initialization script
│   ├── package.json                      # Updated with MFA dependencies
│   ├── tsconfig.build.json               # TypeScript build config
│   └── tsconfig.json                     # TypeScript config
│
├── frontend/
│   ├── public/
│   │   └── index.html                    # HTML entry point
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccountSecurity.tsx       # New security settings component
│   │   │   ├── BackupCodes.tsx           # New backup codes component
│   │   │   ├── FileList.tsx              # File browser component
│   │   │   ├── FileUpload.tsx            # File upload component
│   │   │   ├── Layout.tsx                # Updated app layout with security link
│   │   │   ├── MfaSetup.tsx              # New MFA setup component
│   │   │   ├── MfaVerification.tsx       # New MFA verification component
│   │   │   └── ProtectedRoute.tsx        # Auth protection wrapper
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx           # Updated auth context with MFA
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx             # Main app dashboard
│   │   │   ├── Login.tsx                 # Updated login with MFA flow
│   │   │   └── Register.tsx              # User registration
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                    # Updated API service with MFA endpoints
│   │   │
│   │   ├── utils/
│   │   │   └── theme.ts                  # Material UI theme config
│   │   │
│   │   ├── App.tsx                       # Updated main app component with MFA routes
│   │   ├── index.css                     # Global styles
│   │   └── index.tsx                     # React entry point
│   │
│   ├── package.json                      # Frontend dependencies
│   └── tsconfig.json                     # TypeScript config
│
├── tests/
│   ├── simulate-github-action.sh         # GitHub Actions local simulation
│   ├── test-hcp-all.sh                   # HCP API tests
│   ├── test-hcp-auth.sh                  # HCP Auth tests
│   ├── test-hcp-secrets.sh               # HCP Secrets tests
│   └── test-hcp-secrets-alt.sh           # Alternative HCP Secrets tests
│
├── docker-compose.yml                    # Docker Compose configuration
├── Dockerfile                            # Combined service Dockerfile
├── Makefile                              # Project build commands
├── README.md                             # Project documentation
└── package.json                          # Root package.json for the monorepo
```

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. **Open an Issue First**: Before starting work, please open a GitHub issue describing the change you wish to make. This allows for discussion and ensures your time is well spent.
2. **Request Assignment**: Comment on the issue requesting to be assigned to it. This helps prevent duplicate work.
3. **Follow Branch Naming Convention**: All branches should follow our naming convention:
   ```
   <prefix>/<work-item-identifier>-<short-description>
   ```
   
   Where:
   - `<prefix>` is one of: `feature`, `bugfix`, `hotfix`, `task`, or `patch`
   - `<work-item-identifier>` is the issue number (e.g., GH-123)
   - `<short-description>` is a brief, hyphenated description

   Example: `feature/GH-45-user-authentication`

4. **Fork the repository**
5. **Create your branch** following the naming convention
6. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
7. **Push to the branch** (`git push origin feature/GH-45-user-authentication`)
8. **Open a Pull Request**

**Note**: Pull requests with passing tests are reviewed on a weekly basis. Including tests with your contribution will speed up the review process.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
