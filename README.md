# ClientLocker – Secure Client Document Management System

A secure client document management portal that helps accounting firms manage client documents, control access, and review AI-powered document classification suggestions.

**Live link:** https://clientlocker-omega.vercel.app/

**GitHub:** https://github.com/gowtham-gk-jj/clientlocker

## Recordings

- **Working Flow:** https://drive.google.com/file/d/1SsLzqWH4YN71JOXBUDMqqUrI_ldovYc9/view?usp=sharing
- **AI Feature Demonstration:** https://drive.google.com/file/d/1eXAz5hyOAhIkT1GM9lMr2pjjvAfvd0f4/view?usp=sharing

## Test logins

All demonstration accounts use made-up data.

**Common password:** `ClientLocker@2026`

| Role | Email | Password |
|---|---|---|
| Partner | kavitha.partner@clientlocker.test | ClientLocker@2026 |
| Partner | arun.partner@clientlocker.test | ClientLocker@2026 |
| Staff | priya.staff@clientlocker.test | ClientLocker@2026 |
| Staff | karthik.staff@clientlocker.test | ClientLocker@2026 |
| Client | aadhavan.traders.client@clientlocker.test | ClientLocker@2026 |
| Client | meenakshi.textiles.client@clientlocker.test | ClientLocker@2026 |
| Auditor | senthil.auditor@clientlocker.test | ClientLocker@2026 |

Additional seeded accounts are available in the database seed script.

Run the seed script before using these credentials.

## What it does

1. **User Authentication:** Provides login functionality for partners, staff, clients and auditors with role-based dashboards.
2. **Client Management:** Allows authorized partners and staff to manage and access client information according to permissions.
3. **Document Management:** Allows authorized users to upload, list and open PDF, JPG and PNG documents, with a maximum upload size of 4 MB.
4. **Access Control:** Restricts access to client documents according to user roles and client assignments.
5. **AI-Powered Document Intelligence:** Analyzes uploaded document text, suggests document classifications and matches documents with client checklist requirements for human review and approval.

## The AI feature

- **What it does:** ClientLocker uses a separately hosted Standalone-AI microservice to analyze uploaded PDF document text, identify the likely document type, and suggest matching client checklist requirements. It provides confidence scores and explanations. Suggestions remain pending until an authorized partner or staff member approves or rejects them. Approved suggestions can update the matching checklist item.

- **Which free model it uses:** The AI model name is not specified in the current project documentation. The AI service is implemented separately using FastAPI.

- **What happens if the AI service is not available:** The application continues to support manual document management and checklist workflows. AI suggestions cannot be generated while the service is unavailable. Users can continue their work without  
AI assistance.

## AI environment variables

Configure these settings in the backend environment:

AI_SERVICE_URL=https://standalone-ai-clientlocker.onrender.com
AI_SERVICE_API_KEY=HaT9c0cyXr40_KdoUJFlqEO1mx0vS0pKz2mZGqf7G_Q_LgumEWyq5DoGqpcYmFKV
AI_SERVICE_TIMEOUT_MS=60000

Use the same shared secret in the Standalone-AI service. Never expose the API key in frontend code or GitHub.
## My stack

| Part | Technology | Why I used it |
|---|---|---|
| Frontend | React.js, Vite, JavaScript | Build a responsive and interactive interface |
| Styling | CSS | Create the application design and layouts |
| Routing | React Router | Manage navigation between pages |
| API communication | Axios | Connect frontend and backend |
| Animations | Framer Motion | Add smooth interface animations |
| Icons | Lucide React | Provide consistent interface icons |
| Backend | Node.js, Express.js | Build REST APIs and server-side functionality |
| Database | MongoDB, Mongoose | Store users, clients, permissions and checklist information |
| Authentication | JWT, bcryptjs | Handle authentication and password hashing |
| AI service | Python, FastAPI | Provide standalone AI document analysis |
| Frontend hosting | Vercel | Deploy the frontend application |
| Backend hosting | Render | Host the backend API |
| Source control | GitHub | Store and manage project code |
| Automated checks | GitHub Actions | Run project checks |
| Development AI tools | Antigravity, ChatGPT | Assist with development, debugging and documentation |

## Main design choices

### Database collections and models

| Model / Collection | Purpose |
|---|---|
| Firm | Store accounting firm information |
| Person | Store partner, staff and auditor accounts |
| Client | Store client information |
| ClientAccess | Manage user-to-client access assignments |
| ChecklistItem | Maintain client document checklist requirements |
| DownloadLink | Manage temporary document download links |
| ActivityLog | Record relevant application activities and actions |

### Key design decisions

- Used separate dashboards for different user roles.
- Used role-based authorization to restrict access to application features.
- Used backend validation instead of relying only on frontend restrictions.
- Designed private document access to protect confidential client files.
- Restricted document uploads to PDF, JPG and PNG with a 4 MB maximum size.
- Used a separate AI microservice instead of placing AI processing inside the frontend.
- Added human approval and rejection for AI-generated checklist suggestions.
- Kept AI service credentials in backend environment variables.
- Used a consistent purplish-blue design theme with dark navy text.
- Designed the interface to be responsive across different screen sizes.

## How to run it on your computer

### Prerequisites

- Node.js
- npm
- Git
- MongoDB

### 1. Clone the repository

```bash
git clone https://github.com/gowtham-gk-jj/clientlocker.git
cd clientlocker
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment variables

Create a `.env` file inside the backend directory.

Required settings include:

- PORT
- MONGO_URI
- JWT_SECRET
- AI service URL and authentication settings, if enabled

Never commit real credentials or API keys to GitHub.

### 4. Seed the database

From the backend directory:

```bash
node scripts/seed.js
```

### 5. Start the backend

```bash
npm run dev
```

### 6. Install frontend dependencies

Open another terminal:

```bash
cd clientlocker/frontend
npm install
```

### 7. Configure frontend environment variables

Create a `.env` file inside the frontend directory.

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 8. Start the frontend

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

### 9. Build the frontend

```bash
npm run build
```

### Settings required

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `VITE_API_BASE_URL`
- AI service URL
- AI service authentication credentials

Actual environment variable names should match the application configuration.

## How to run the tests

### Backend

```bash
cd backend
npm test
```

### Frontend production build check

```bash
cd frontend
npm run build
```

The production build command checks whether the frontend compiles successfully.

Additional manual test scenarios include:

1. Partner login.
2. Staff login.
3. Client login.
4. Invalid login rejection.
5. Authorized document upload.
6. PDF upload validation.
7. JPG upload validation.
8. PNG upload validation.
9. File size validation.
10. Document listing and opening.

**Note:** Confirm that `npm test` is configured in the backend `package.json` before using it as the automated test command.

## Made-up data

ClientLocker uses demonstration records generated through its database seed script.

The sample firm is:

**Vaigai Vel & Associates**

The seeded demonstration data includes:

- 1 accounting firm.
- 2 partner accounts.
- 6 staff accounts.
- 10 client accounts.
- 1 auditor account.
- 50 checklist items.
- Staff-client assignments.
- Auditor-client assignments.

Sample client names include Aadhavan Traders, Meenakshi Textiles, Pandian Exports, Vaigai Foods and Thamarai Engineering.

All demonstration account names, email addresses and client records are synthetic. No real customer records or confidential client documents are intentionally included in the seed data.

## What works

- **Fully working:**
  - Public landing page and responsive frontend.
  - User authentication and role-based dashboards.
  - Client management.
  - Client document upload and listing.
  - PDF, JPG and PNG upload support.
  - Document opening.
  - Backend API and MongoDB integration.
  - Live deployment.
  - Lighthouse Desktop Performance score of 89/100.
  - AI document classification and checklist suggestion workflow, including human review, as implemented.

- **Partly done:**
  - Advanced permission and access management, subject to verification of all role-specific endpoints.
  - Auditor-specific workflows and restricted access.
  - Temporary download links and expiry handling.
  - Activity logging and security test coverage.
  - Additional automated testing and edge-case validation.

- **Skipped:**
  - Automatic checklist completion without human approval, intentionally excluded for security.
  - AI processing of scanned or image-only PDFs without an OCR workflow.

## What I would do differently with more time

- Improve the Lighthouse Performance score beyond 89.
- Further optimize initial page rendering and Speed Index.
- Expand automated backend and frontend testing.
- Improve document preview and management features.
- Add more detailed security monitoring and audit reporting.
- Improve AI document classification accuracy.
- Add OCR support for scanned documents.
- Improve error handling and AI service availability monitoring.
- Perform additional security and performance testing.

---

**ClientLocker – Your Documents. Our Priority.**

Developed as part of the Vizdale Full-Stack Developer Internship – November 2026.