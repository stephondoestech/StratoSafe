# StratoSafe

**Tagline:** *"StratoSafe – Secure Your Files in the Cloud."*

**Repository Description:**  
StratoSafe is a secure, scalable cloud storage solution that allows users to register, log in, and easily upload, view, and download their files. Built with a robust Node.js backend (using Express, TypeORM, and PostgreSQL) and a modern React frontend (powered by Material UI), StratoSafe offers a complete, containerized solution for personal and business file management.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Setup Instructions](#setup-instructions)
  - [Local Development](#local-development)
  - [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [License](#license)

---

## Features

- **User Registration & Login:** Secure authentication using JWT and bcrypt.
- **File Upload & Download:** Easily upload files with progress tracking and download them on demand.
- **File Preview:** Preview images and other files directly in the browser.
- **Secure API:** Built with Express, enhanced security headers (Helmet), and rate limiting.
- **Containerized Deployment:** Docker and Docker Compose support for seamless deployment.
- **Modern Frontend:** A responsive React app using Material UI for a polished user experience.

---

## Tech Stack

- **Backend:** Node.js, Express, TypeORM, PostgreSQL, Multer, JWT, bcrypt, Helmet, CORS, dotenv
- **Frontend:** React, Material UI, Axios, TypeScript
- **Containerization:** Docker, Docker Compose

---

## Directory Structure

```
StratoSafe/
├── backend/                # Node.js backend for StratoSafe
│   ├── src/
│   │   ├── models/
│   │   │   ├── File.ts     # File entity/model
│   │   │   └── User.ts     # User entity/model
│   │   └── server.ts       # Express server with API endpoints
│   ├── package.json        # Backend dependencies & scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── Dockerfile          # Docker configuration for the backend
├── frontend/               # React frontend for StratoSafe
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── App.tsx         # Main app component with Material UI integration
│   │   └── index.tsx       # React entry point
│   ├── package.json        # Frontend dependencies & scripts
│   └── Dockerfile          # Docker configuration for the frontend
├── docker-compose.yml      # Compose file to run PostgreSQL, backend, & frontend together
└── .env                    # Environment variables (for local development or Docker)
```

---

## Setup Instructions

### Local Development

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/stratosafe.git
   cd stratosafe
   ```

2. **Backend Setup:**

   - Navigate to the `backend` directory:

     ```bash
     cd backend
     ```

   - Install dependencies:

     ```bash
     npm install
     ```

   - Create a `.env` file in the `backend` folder (see [Environment Variables](#environment-variables) below).

   - Start the backend server:

     ```bash
     npm start
     ```

3. **Frontend Setup:**

   - In a new terminal, navigate to the `frontend` directory:

     ```bash
     cd frontend
     ```

   - Install dependencies:

     ```bash
     npm install
     ```

   - Start the frontend development server:

     ```bash
     npm start
     ```

   - The frontend will be available at [http://localhost:3001](http://localhost:3001).

### Docker Deployment

1. **Ensure Docker & Docker Compose Are Installed.**

2. **At the Project Root, Create or Verify Your `.env` File:**

   (See [Environment Variables](#environment-variables) below.)

3. **Build and Run Containers:**

   ```bash
   docker-compose up --build
   ```

   - The PostgreSQL container will run on port 5432.
   - The backend API will be available at [http://localhost:3000](http://localhost:3000).
   - The frontend app will be available at [http://localhost:3001](http://localhost:3001).

4. **To Stop the Containers:**

   ```bash
   docker-compose down
   ```

---

## Environment Variables

Create a `.env` file at the root of the project (or within each service as needed) with the following variables:

```env
# Backend & Docker
PORT=3000
JWT_SECRET=your_jwt_secret_here
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=your_pg_username
DB_PASSWORD=your_pg_password
DB_DATABASE=stratosafe
```

Replace the placeholder values with your actual credentials. You can also use Docker Compose's `env_file` option if preferred.

---

## Usage

- **Register / Login:**  
  Access the StratoSafe web app, register a new account, or log in with existing credentials.

- **Upload Files:**  
  Use the "Choose File" button to select and upload files. The app will display upload progress.

- **View Files:**  
  Your files are listed with options to download or preview (if applicable).

- **Download Files:**  
  Click the download icon next to a file to download it locally.

- **Logout:**  
  Use the logout button in the app bar to end your session.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

*StratoSafe – Secure Your Files in the Cloud.*

Feel free to customize this README further to suit your specific needs or branding details. Happy coding!
