# ClientLocker – Secure Client Document Management System

<p align="center">
  <strong>Your Documents. Our Priority.</strong>
</p>

<p align="center">
  A secure client document management portal for accounting firms.
</p>

<p align="center">
  <a href="https://clientlocker-omega.vercel.app/">Live Demo</a>
</p>

---

## 1. Project Overview

ClientLocker is a private client document management system developed for **Vaigai Vel & Associates**, an accounting firm in Madurai.

The application helps accounting firms securely upload, organize, manage, and access client documents.

It provides role-based access control to ensure that users can access only the documents and client information they are authorized to view.

## 2. Live Application

**Live Website:** https://clientlocker-omega.vercel.app/

## 3. Main Objectives

- Securely manage client documents.
- Prevent unauthorized access to confidential files.
- Provide role-based access control.
- Allow partners to manage staff permissions.
- Maintain an activity log of document operations.
- Provide clients with secure access to their documents.
- Support auditor access to specifically assigned clients.

## 4. User Roles

| Role | Responsibilities |
|---|---|
| Partner | Manage clients, staff access, documents and activity logs |
| Staff | Access assigned clients and upload documents |
| Client | View and open their own documents |
| Auditor | View documents belonging to assigned clients |

## 5. Key Features

- Public landing page
- About page
- User authentication
- Role-based dashboards
- Client management
- Document upload and management
- Private document access
- Staff-client assignment
- Activity logging
- Secure client login using magic links
- Temporary download links
- AI-powered document checklist suggestions

*Features are part of the project scope; availability depends on implementation progress.*

## 6. Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS
- React Router
- Axios
- Framer Motion
- Lucide React

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### Deployment
- GitHub – Source code management
- Vercel – Frontend deployment

## 7. Project Structure

```text
clientlocker/
│
├── backend/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   └── layout/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   ├── auth/
│   │   │   ├── partner/
│   │   │   ├── staff/
│   │   │   └── auditor/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── docs/
│   └── PLAN.pdf
│
└── README.md
```

## 8. Installation and Setup

### Prerequisites

- Node.js
- npm
- Git
- MongoDB

### Clone the Repository

```bash
git clone https://github.com/gowtham-gk-jj/clientlocker.git
```

### Setup Frontend

```bash
cd clientlocker/frontend
npm install
```

### Start Frontend Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

### Build for Production

```bash
npm run build
```

## 9. Environment Variables

Configure environment variables in your local environment.

Example:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

Never upload `.env` files, passwords, database credentials, or secret API keys to GitHub.

## 10. Security Guidelines

- Enforce authorization on the backend.
- Never trust roles supplied by the frontend.
- Restrict staff access to assigned clients.
- Store documents in private storage.
- Use expiring download links.
- Record document access and blocked attempts.
- Use made-up data during development and testing.

## 11. Development Status

The project is being developed as part of the **Vizdale Full-Stack Developer Internship – November 2026**.

The public landing page is deployed on Vercel. Authentication, document management, role-based permissions, and other backend features are part of the ongoing development work.

## 12. Project Information

**Project Name:** ClientLocker

**Client:** Vaigai Vel & Associates

**Location:** Madurai, Tamil Nadu, India

**Developer:** Gowtham

**Internship:** Vizdale Full-Stack Developer Internship

**Duration:** November 2026

---

<p align="center">
  <strong>ClientLocker – Your Documents. Our Priority.</strong>
</p>
