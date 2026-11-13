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

ClientLocker is a secure client document management system developed for **Vaigai Vel & Associates**, an accounting firm based in Madurai, Tamil Nadu, India.

The application helps accounting firms securely upload, organize, manage and access confidential client documents.

It provides role-based authentication and separate dashboards for different users, ensuring that partners, staff and clients can access the appropriate client information and documents.

The primary objective is to prevent unauthorized access to confidential client files while providing a centralized platform for document management.

## 2. Live Application

**Live Website:** https://clientlocker-omega.vercel.app/

**GitHub Repository:** https://github.com/gowtham-gk-jj/clientlocker

## 3. Project Objectives

- Securely manage client documents.
- Prevent unauthorized access to confidential files.
- Provide role-based authentication and authorization.
- Create separate dashboards for different user roles.
- Allow partners and authorized staff to upload client documents.
- Allow clients to view and open their own documents.
- Store uploaded documents securely.
- Restrict staff access according to client assignments.
- Maintain an organized document management system.
- Provide a foundation for activity tracking and advanced access management.

## 4. User Roles

| Role | Responsibilities |
|---|---|
| Partner | Access clients, manage documents and staff permissions, and view activity logs as implemented. |
| Staff | Access assigned clients and upload and open client documents. |
| Client | Log in and view and open their own documents. |
| Auditor | View documents belonging to assigned clients. (M3) |

## 5. Key Features

### M1 – Initial Development

- Public landing page.
- About page.
- Responsive frontend.
- Initial project setup.
- Live frontend deployment.

### M2 – Authentication and Document Management

- Email and password authentication.
- Partner, Staff and Client login.
- Role-based dashboards.
- Client management.
- Client document upload.
- PDF, JPG and PNG file support.
- Maximum upload size of 4 MB.
- Document listing.
- Display uploaded filename.
- Display uploader information.
- Display document upload date.
- Document opening functionality.
- Backend API integration.
- Database integration.
- Private document storage.

### M3 – Planned Features

- Server-side client access enforcement.
- Staff-client access assignment and removal.
- Auditor role and restricted client access.
- Client magic-link authentication.
- Temporary download links with 10-minute expiry.
- Activity logging for document operations.
- Blocked access attempt logging.
- AI-powered document checklist suggestions.
- AI suggestion confirmation workflow.
- Automated permission and security tests.

*Feature availability depends on implementation and successful testing.*

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
- Mongoose

### Authentication and Security

- JWT authentication (where configured)
- bcryptjs password hashing
- Role-based access control
- Backend authentication middleware
- File type and size validation

### Deployment and Development

- GitHub – Source code management
- Vercel – Frontend deployment
- GitHub Actions – Automated checks

## 7. Project Structure

```text
clientlocker/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   │   ├── Firm.js
│   │   ├── Person.js
│   │   ├── Client.js
│   │   ├── ClientAccess.js
│   │   └── ChecklistItem.js
│   ├── routes/
│   ├── scripts/
│   │   └── seed.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
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
│   │   │   └── client/
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
├── .github/
│   └── workflows/
│
├── .gitignore
└── README.md
```

*This is a reference structure. Actual folders and filenames may differ according to the implementation.*

## 8. Database Seed Data

ClientLocker includes a database seed script to generate demonstration data.

The seed script creates the following records:

| Collection / Data | Records |
|---|---:|
| Firms | 1 |
| Partners | 2 |
| Staff | 6 |
| Clients | 10 |
| Client login accounts | 10 |
| Checklist items | 50 |
| Auditors | 1 |
| Staff-client assignments | 10 |
| Auditor-client assignments | 2 |

### Seeded Firm

**Firm Name:** Vaigai Vel & Associates

### Seeded Clients

1. Aadhavan Traders
2. Meenakshi Textiles
3. Pandian Exports
4. Vaigai Foods
5. Thamarai Engineering
6. Kurinji Enterprises
7. Marutham Agencies
8. Annamalai Stores
9. Chola Packaging
10. Ponni Agro Products

### Checklist Items

Each client receives five checklist items:

1. March bank statement
2. Sales invoices
3. Purchase invoices
4. Tax return documents
5. Business financial statements

## 9. Demo Login Credentials

The following credentials are generated by the project's database seed script.

**Common Demo Password for All Accounts:**

```text
ClientLocker@2026
```

### Partner Accounts

| Name | Email | Password |
|---|---|---|
| Kavitha Vel | kavitha.partner@clientlocker.test | ClientLocker@2026 |
| Arun Vel | arun.partner@clientlocker.test | ClientLocker@2026 |

### Staff Accounts

| Name | Email | Password |
|---|---|---|
| Priya Raman | priya.staff@clientlocker.test | ClientLocker@2026 |
| Karthik Kumar | karthik.staff@clientlocker.test | ClientLocker@2026 |
| Divya Raj | divya.staff@clientlocker.test | ClientLocker@2026 |
| Suresh Balan | suresh.staff@clientlocker.test | ClientLocker@2026 |
| Meena Joseph | meena.staff@clientlocker.test | ClientLocker@2026 |
| Gokul Trainee | gokul.trainee@clientlocker.test | ClientLocker@2026 |

### Client Accounts

| Client | Email | Password |
|---|---|---|
| Aadhavan Traders | aadhavan.traders.client@clientlocker.test | ClientLocker@2026 |
| Meenakshi Textiles | meenakshi.textiles.client@clientlocker.test | ClientLocker@2026 |
| Pandian Exports | pandian.exports.client@clientlocker.test | ClientLocker@2026 |
| Vaigai Foods | vaigai.foods.client@clientlocker.test | ClientLocker@2026 |
| Thamarai Engineering | thamarai.engineering.client@clientlocker.test | ClientLocker@2026 |
| Kurinji Enterprises | kurinji.enterprises.client@clientlocker.test | ClientLocker@2026 |
| Marutham Agencies | marutham.agencies.client@clientlocker.test | ClientLocker@2026 |
| Annamalai Stores | annamalai.stores.client@clientlocker.test | ClientLocker@2026 |
| Chola Packaging | chola.packaging.client@clientlocker.test | ClientLocker@2026 |
| Ponni Agro Products | ponni.agro.products.client@clientlocker.test | ClientLocker@2026 |

### Auditor Account (M3)

| Name | Email | Password |
|---|---|---|
| Senthil Nathan | senthil.auditor@clientlocker.test | ClientLocker@2026 |

**Important Notes:**

- All seeded accounts use the same password.
- Run the database seed script before using these credentials.
- These credentials are intended for demonstration and testing.
- The auditor account is intended for M3 testing.
- Do not use demonstration credentials in production.
- Never use real client information or confidential documents.

## 10. Installation and Setup

### Prerequisites

Install the following tools before starting:

- Node.js
- npm
- Git
- MongoDB

### Step 1: Clone the Repository

```bash
git clone https://github.com/gowtham-gk-jj/clientlocker.git
```

Navigate to the project:

```bash
cd clientlocker
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

### Step 3: Configure Backend Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```

Add any other environment variables required by your backend configuration.

### Step 4: Run Database Seed Script

From the backend directory:

```bash
node scripts/seed.js
```

Expected successful output:

```text
MongoDB connected successfully.

========== CLIENTLOCKER DATABASE CHECK ==========

All seeded records verified successfully.

========== DEMO LOGIN DETAILS ==========

CLIENTLOCKER SEED COMPLETED SUCCESSFULLY!
```

### Step 5: Start Backend Server

```bash
npm run dev
```

The backend should run on the configured port.

### Step 6: Frontend Setup

Open another terminal:

```bash
cd clientlocker/frontend
npm install
```

### Step 7: Configure Frontend Environment Variables

Create a `.env` file inside the frontend directory.

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Change the port if your backend uses a different port.

### Step 8: Start Frontend Development Server

```bash
npm run dev
```

Open the application:

```text
http://localhost:5173
```

### Step 9: Build for Production

```bash
npm run build
```

## 11. M2 Complete Working Flow

The primary M2 demonstration flow covers authentication and client document management.

### Step 1: User Login

Open the ClientLocker application and log in using one of the seeded accounts.

Supported M2 roles:

- Partner
- Staff
- Client

### Step 2: Role-Based Dashboard

After successful authentication, the user is redirected to the appropriate dashboard based on their account role.

### Step 3: Client Navigation

Navigate to the appropriate client based on the user's available access.

### Step 4: Upload Client Document

Authorized users can upload supported documents.

Supported formats:

- PDF
- JPG
- PNG

Maximum file size: 4 MB.

### Step 5: Document Listing

After uploading, the document should appear in the client's document list.

The document list displays:

- Filename
- Uploaded by
- Upload date

### Step 6: Open Document

Select the uploaded document and verify that it opens successfully.

## 12. Environment Variables and Security

Environment variables must be configured locally and on the appropriate deployment platform.

Example frontend variable:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Example backend variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```

### Security Guidelines

- Never commit `.env` files to GitHub.
- Never expose database credentials.
- Never expose authentication secrets.
- Keep private API keys on the server.
- Validate uploaded file types and sizes on the backend.
- Store confidential documents in private storage.
- Enforce authorization on backend endpoints.
- Never trust roles supplied by the frontend.
- Use made-up data for development and testing.

## 13. M2 Testing Checklist

The following checks are important for verifying the M2 working flow.

| No. | Test Case | Expected Result |
|---|---|---|
| 1 | Partner login | Partner dashboard opens |
| 2 | Staff login | Staff dashboard opens |
| 3 | Client login | Client dashboard opens |
| 4 | Invalid login credentials | Login is rejected |
| 5 | Authorized document upload | File uploads successfully |
| 6 | Upload PDF file | PDF is accepted |
| 7 | Upload JPG file | JPG is accepted |
| 8 | Upload PNG file | PNG is accepted |
| 9 | Upload file larger than 4 MB | Upload is rejected |
| 10 | View uploaded documents | Document details are displayed |
| 11 | Open uploaded document | Document opens successfully |

*These are demonstration test cases. Actual results should be verified before marking them as passed.*

## 14. M2 Screen Recording

**60-Second Working Flow Demonstration**

Recording Link: [Add your Google Drive recording link here]

The recording should demonstrate:

1. User login.
2. Role-based dashboard navigation.
3. Client selection.
4. Document upload.
5. Document listing.
6. Document opening.

**Recording Guidelines:**

- Upload the recording to Google Drive.
- Set sharing to Anyone with the link.
- Test the recording link in a private browser window.
- Add the working link above.
- Do not upload the recording to YouTube or LinkedIn.

## 15. Development Milestones

ClientLocker is being developed as part of the Vizdale Full-Stack Developer Internship.

| Milestone | Deliverables | Status |
|---|---|---|
| M1 | Initial setup, live landing page and project plan | Completed |
| M2 | Authentication, role-based dashboards and document upload/open flow | M2 submission |
| M3 | Server-side access rules, magic links, download links, activity logs, auditor and AI feature | Upcoming |
| M4 | Final fixes, documentation, testing, video and hand-in | Upcoming |

## 16. Future Improvements

Planned improvements include:

- Advanced client permission management.
- Secure magic-link authentication.
- Expiring document download links.
- Complete activity history.
- Auditor-specific document access.
- AI-powered document checklist suggestions.
- Improved document security.
- Additional automated backend tests.

## 17. Project Information

| Detail | Information |
|---|---|
| Project Name | ClientLocker |
| Client | Vaigai Vel & Associates |
| Location | Madurai, Tamil Nadu, India |
| Developer | Gowtham |
| Internship | Vizdale Full-Stack Developer Internship |
| Duration | 1–30 November 2026 |
| Current Milestone | M2 |
| Project Type | Full-Stack Web Application |

---

<p align="center">
  <strong>ClientLocker – Your Documents. Our Priority.</strong>
</p>

<p align="center">
  Developed as part of the Vizdale Full-Stack Developer Internship – November 2026.
</p>