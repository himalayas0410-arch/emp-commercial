# EMP Commercial (Emergency Medical Portal)
## Company & Employee Emergency Medical Management Platform

EMP Commercial is an enterprise and employee emergency medical management platform. It enables organizations to fulfill corporate duty-of-care obligations while strictly preserving employee medical privacy through cryptographically secure QR codes, granular data minimization, and real-time emergency alert workflows.

---

## 🌟 Core Architectural Principles

1. **Strict Data Minimization & Privacy**: A public QR scan presents only essential, user-approved emergency information (e.g. blood group, severe allergies, critical medications/devices, emergency notes). The complete private medical record remains confidential and is never returned over public endpoints.
2. **Employer Access Restrictions**: Company HR administrators can manage onboarding and view emergency alerts, but **never** have access to employees' private diagnoses or full medical histories.
3. **Cryptographically Secure QR Lifecycle**:
   - Random, unpredictable tokens (e.g. `EMP-E624AB888E97`).
   - Server-side validation on every scan.
   - Reversible **Temporary Suspension** (displays neutral message, stops disclosure).
   - Permanent **Revocation** (irreversibly invalidates old physical prints).
   - **Atomic Regeneration** (revokes old token and mints new one without downtime).
4. **Independent Family Accounts & Unique QR Codes**: Dependents and invited family members receive **their own separate medical profiles and distinct QR tokens**; family members never inherit employee QR codes.
5. **Real-Time Multi-Channel Notification Pipeline**:
   - Dispatches emergency alerts across In-App, SMS (Twilio), Email (Resend/SMTP), and Push notifications.
   - Comprehensive delivery tracking with retry counts, provider references, and failure reasons.
   - Real-time acknowledgment by designated company responders or family members.
6. **DPDP Act 2023 Compliance**: Incorporates Indian Digital Personal Data Protection Act (2023) standards, including purpose limitation, granular disclosure toggles, explicit consent logging, and right to data erasure/export.

---

## 🏗️ Technology Stack

- **Backend**: Node.js, Express, TypeScript, JWT auth, bcryptjs, crypto-token hashing, express-rate-limit.
- **Database**: 
  - Primary: **Supabase PostgreSQL** (`xbagfykmyyqvovcktczv`) via `@supabase/supabase-js` with applied SQL migrations for 12 core tables.
  - Secondary: High-performance ACID JSON/memory cache for local testing and offline resilience.
- **Frontend**: Vite, React 18, TypeScript, Lucide Icons, Vanilla CSS Modern HealthTech Design System (`index.css`), QRCode canvas generator, jsPDF CR80 badge generator.
- **Testing**: Vitest + Supertest automated API test suite covering Scenarios A through F.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js v18+ (tested on v22.13.0)
- npm v9+

### 2. Installation
```bash
git clone <repo-url>
cd "emp portal"
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (copied from `.env.example`):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=emp_commercial_super_secure_jwt_secret_2026_99cc663d
FRONTEND_URL=http://localhost:5173

# Supabase Credentials (Pre-configured for project emp)
SUPABASE_URL=https://xbagfykmyyqvovcktczv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWdmeWtteXlxdm92Y2t0Y3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTc5ODYsImV4cCI6MjEwNzk5Mzk4Nn0.pcBbx6dJvIyOXnxsnQSbzORN1z0V_L1HNFqDoLRqICE

# Optional Notification Provider Credentials (fallback logger enabled by default)
SMS_PROVIDER=mock_logger
EMAIL_PROVIDER=mock_logger
PUSH_PROVIDER=mock_logger
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
RESEND_API_KEY=
```

### 4. Run Development Servers
```bash
# Run both Backend (port 5000) and Frontend (port 5173) concurrently:
npm run dev
```

- **Frontend Portal**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5000/api`
- **Public Emergency QR View**: `http://localhost:5173/e/EMP-E624AB888E97` (Zero Login Required)

### 5. Run Automated Tests
```bash
npm test
```
Runs 13 full-stack automated tests covering authentication, data minimization, QR suspension/revocation, dependent QR uniqueness, company HR tenant isolation, and incident acknowledgment.

### 6. Production Bundle Build
```bash
npm run build
```

---

## 👥 Demo Evaluation Accounts

Use the 1-click switcher in the top navigation bar or enter the following pre-seeded credentials:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Employee** | `rahul.sharma@apexglobal.com` | `Emp@123` | Personal profile, QR management, family hub, emergency contacts |
| **Company HR Admin** | `hr@apexglobal.com` | `Emp@123` | Employee directory, CSV bulk import, incident log & ack, hotline config |
| **Super Admin** | `superadmin@emp.com` | `Admin@123` | Tenant organizations, platform metrics, security audit trail |
| **Public Responder** | *No login needed* | *N/A* | Public emergency view at `/e/:token`, 1-tap phone dialers, emergency alert button |

---

## 📊 Database Schema Reference

The database consists of 12 tables deployed to Supabase PostgreSQL:
1. `organizations`: Tenant companies, emergency hotlines, duty-of-care settings.
2. `users`: Credentials, full names, roles, account statuses.
3. `organization_memberships`: Tenant isolation association between users and companies.
4. `medical_profiles`: Clinical vitals, allergies, medications, devices, emergency notes, and `public_disclosures` JSONB.
5. `emergency_contacts`: Priority-ordered family and physician contacts with alert flags.
6. `family_relationships`: Dependent and adult independent family associations.
7. `qr_tokens`: Cryptographic public tokens, SHA-256 hashes, statuses (`active`, `suspended`, `revoked`), scan counters.
8. `emergency_incidents`: Unique incident records (`INC-...`), GPS coordinates, acknowledgment statuses.
9. `notification_deliveries`: Channel delivery attempts (SMS, Email, Push, In-App), statuses, and provider IDs.
10. `consent_records`: DPDP Act 2023 compliance consent timestamps and policy versions.
11. `audit_logs`: Tamper-evident trail of logins, profile updates, QR actions, and emergency triggers.
12. `subscriptions`: Organization license tiers (`starter`, `growth`, `enterprise`) and seat limits.

---

## 📱 Mobile & Public Scanner Features

- **PWA Ready**: Mobile-first responsive layout with bottom navigation bar.
- **CR80 Printable ID Badge**: Generates standard credit-card-sized PDF badges with emergency prompt, QR code, and blood group.
- **High-Res PNG Export**: Instant download of QR graphics for wallet cards, helmets, or company badges.
- **Offline / Low-Connectivity Resilience**: Compact emergency scan page loads in milliseconds with zero heavy frameworks or authentication gates.
