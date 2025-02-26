# StratoSafe

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

- **🔐 User Authentication:** Secure login and registration with JWT and bcrypt
- **📁 File Management:** Easily upload, download, and manage your files
- **🔒 Privacy-Focused:** Your files are accessible only to you
- **💻 Modern UI:** Clean, responsive design with Material UI
- **🐳 Easy Deployment:** Docker ready for quick deployment
- **📱 Mobile-Friendly:** Access your files on any device

## Demo

![StratoSafe Demo](https://via.placeholder.com/800x450.png?text=StratoSafe+Demo)

*[Note: Replace with actual screenshots of your application once available]*

## Quick Start

The fastest way to get StratoSafe running is with Docker:

```bash
# Clone the repository
git clone https://github.com/yourusername/stratosafe.git
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
   git clone https://github.com/yourusername/stratosafe.git
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
- **[JWT](https://jwt.io/)** - Authentication mechanism
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Frontend
- **[React](https://reactjs.org/)** - UI library
- **[Material UI](https://mui.com/)** - Component library
- **[React Router](https://reactrouter.com/)** - Routing
- **[Axios](https://axios-http.com/)** - HTTP client
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Infrastructure
- **[Docker](https://www.docker.com/)** - Containerization
- **[Docker Compose](https://docs.docker.com/compose/)** - Multi-container management
- **[Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)** - Monorepo management
- **[Nginx](https://nginx.org/)** - Web server for frontend (in Docker)

## Project Structure

```
StratoSafe/
├── backend/                # Backend (Node.js, Express, TypeORM)
│   ├── src/
│   │   ├── models/         # TypeORM entities (User, File)
│   │   ├── controllers/    # API controllers
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Express middlewares
│   │   ├── data-source.ts  # TypeORM configuration
│   │   └── server.ts       # Express server entry point
│   ├── package.json        # Backend dependencies & scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── Dockerfile          # Docker configuration for backend
├── frontend/               # Frontend (React, Material UI)
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── context/        # React context
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main React component
│   │   └── index.tsx       # React entry point
│   ├── package.json        # Frontend dependencies & scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── Dockerfile          # Docker configuration for frontend
├── docker-compose.yml      # Docker Compose configuration
├── Makefile                # Build and run commands
├── .env                    # Environment variables
└── package.json            # Root package.json for monorepo
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
