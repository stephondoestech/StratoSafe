# StratoSafe

**Tagline:** *"StratoSafe – Secure Your Files in the Cloud."*

## Overview

StratoSafe is a modern, secure cloud storage solution designed to help you safely store, manage, and share your files. Whether you're an individual needing secure personal storage or a business looking for a reliable file management solution, StratoSafe provides an intuitive, feature-rich platform built with the latest web technologies.

The project is composed of two main components:

- **Backend:** A robust Node.js API using Express, TypeORM, and PostgreSQL. It handles user authentication, file uploads/downloads, and secure file management.
- **Frontend:** A responsive React application styled with Material UI that offers a seamless user experience for file management, including real-time upload progress and file previews.

StratoSafe is fully containerized using Docker and Docker Compose, making deployment simple and scalable.

---

## Key Features

- **Secure Authentication:** User registration and login secured with JWT and bcrypt.
- **Easy File Management:** Upload, list, download, and preview files with a user-friendly interface.
- **Modern UI:** Enjoy a sleek and responsive design powered by React and Material UI.
- **Containerized Deployment:** Use Docker Compose to run the complete stack (backend, frontend, and PostgreSQL) with a single command.
- **Yarn Workspaces:** Manage both the backend and frontend from a single repository using Yarn workspaces.

---

## Tech Stack

- **Backend:** Node.js, Express, TypeORM, PostgreSQL, Multer, JWT, bcrypt, Helmet, CORS, dotenv
- **Frontend:** React, Material UI, Axios, TypeScript
- **Containerization:** Docker, Docker Compose
- **Package Manager:** Yarn (with workspaces)

---

## Directory Structure

```
StratoSafe/
├── backend/                # Node.js backend for StratoSafe
│   ├── src/
│   │   ├── models/         # TypeORM models (User, File)
│   │   └── server.ts       # Express server with API endpoints
│   ├── package.json        # Backend dependencies & scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── Dockerfile          # Docker configuration for the backend
├── frontend/               # React frontend for StratoSafe
│   ├── public/
│   │   └── index.html      # HTML template with StratoSafe branding
│   ├── src/
│   │   ├── App.tsx         # Main app component (Material UI)
│   │   └── index.tsx       # React entry point
│   ├── package.json        # Frontend dependencies & scripts
│   └── Dockerfile          # Docker configuration for the frontend
├── docker-compose.yml      # Orchestrates PostgreSQL, backend, & frontend
├── .env                    # Environment variables (backend & Docker)
└── README.md               # This file!
```

---

## Setup Instructions

### Prerequisites

- [Yarn](https://yarnpkg.com/) (v1.x recommended for workspaces)
- [Docker & Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (if running locally)

### Installing Dependencies

This repository uses Yarn workspaces to manage dependencies for both the backend and frontend.

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/stratosafe.git
   cd stratosafe
   ```

2. **Install Dependencies at the Root:**

   ```bash
   yarn install
   ```

   This command installs dependencies for both the `backend` and `frontend` packages.

### Local Development

#### Backend

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a `.env` file in the `backend` directory (see [Environment Variables](#environment-variables) below).

3. Start the backend server:

   ```bash
   yarn start
   ```

   The backend will run on [http://localhost:3000](http://localhost:3000).

#### Frontend

1. Open a new terminal window and navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Start the frontend development server:

   ```bash
   yarn start
   ```

   The frontend will be available at [http://localhost:3001](http://localhost:3001).

#### Running Both Concurrently

From the root of the repository, you can run both services at once:

```bash
yarn start
```

This command uses the `concurrently` package to start both the backend and frontend.

### Docker Deployment

1. Ensure Docker and Docker Compose are installed.

2. At the root of the repository, verify your `.env` file contains the correct values (see [Environment Variables](#environment-variables)).

3. Build and run the containers:

   ```bash
   docker-compose up --build
   ```

   - PostgreSQL will be available on port 5432.
   - The backend API will run on [http://localhost:3000](http://localhost:3000).
   - The frontend app will be available at [http://localhost:3001](http://localhost:3001).

4. To stop the containers, run:

   ```bash
   docker-compose down
   ```

---

## Environment Variables

Create a `.env` file in the project root (or within the backend directory) with the following variables:

```env
# Backend & Docker
PORT=3000
JWT_SECRET=your_jwt_secret_here
DB_HOST=postgres        # Use 'postgres' if running via Docker Compose; use '127.0.0.1' for local PostgreSQL
DB_PORT=5432
DB_USERNAME=your_pg_username
DB_PASSWORD=your_pg_password
DB_DATABASE=stratosafe
```

Replace placeholder values with your actual credentials.

---

## Why StratoSafe?

StratoSafe is designed to be more than just a file storage service. It’s built for those who value:
- **Security:** Your data is encrypted and securely managed.
- **Simplicity:** An intuitive interface that makes file management effortless.
- **Scalability:** A modern architecture that grows with your needs.
- **Innovation:** Built on cutting-edge technologies for a seamless experience.

Whether you’re an individual or a business, StratoSafe offers a secure digital space where your files find a home in the cloud.

---

## License

This project is licensed under the [MIT License](LICENSE).
