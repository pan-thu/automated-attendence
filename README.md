# Automated Attendance Management System

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)![Flutter](https://img.shields.io/badge/Flutter-3.x-blue)![React](https://img.shields.io/badge/React-19.x-61DAFB)![Firebase](https://img.shields.io/badge/Firebase-v11-orange)![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

An enterprise-grade, serverless attendance management system designed to eliminate manual tracking and provide robust, secure, and configurable attendance logic for modern businesses. This project features a cross-platform mobile app for employees and a comprehensive web dashboard for administrators.

## 🌟 Key Features

The system is designed with a two-role architecture: **Employee** and **Admin**.

| Employee Features (Flutter Mobile App) | Admin Features (React Web Dashboard) |
| :--- | :--- |
| 📲 **Secure Clock-In/Out:** Geofence-validated, multi-check attendance recording. | ⚙️ **Dynamic System Configuration:** Manage geofence, time windows, and penalty rules without code changes. |
| 🗓️ **Attendance Calendar:** View detailed daily and monthly attendance history. | 👥 **Full Employee Management:** Onboard, view, edit, and deactivate user accounts. |
| ✈️ **Leave Management:** Submit and track leave requests (Full, Half, Medical). | 审批 **Leave Approval Workflow:** Review, approve, or reject employee leave requests. |
| 📂 **Document Upload:** Attach medical certificates or other documents to leave requests. | 👁️ **Comprehensive Oversight:** View real-time attendance data for all employees. |
| 🔔 **Real-time Notifications:** Receive updates on leave status and system announcements. | ✏️ **Manual Record Correction:** Add or edit attendance records with a mandatory audit reason. |
| 💰 **Penalty & Violation Tracking:** Monitor personal attendance violations and any resulting penalties. | 📈 **Analytics & Reporting:** Generate and view monthly reports on company-wide attendance trends. |

## 🏗️ System Architecture

The project is built on a secure and scalable client-server architecture, with Firebase acting as the serverless backend. All business-critical logic is centralized in Firebase Cloud Functions, making the clients responsible for UI/UX while the backend handles all validation and data processing.

*(This is a placeholder image. You would replace this with a screenshot of the Mermaid diagram from your documentation.)*

For more detailed diagrams and documentation, please see the `/docs` folder.

## 🗂️ Repository Structure

```
.
├── admin/               # Next.js admin dashboard (React, TypeScript)
├── client/              # Flutter mobile app for employees
├── functions/           # Firebase Cloud Functions (TypeScript) and seed scripts
├── docs/                # Architecture, technical specs, task tracking
└── README.md
```

### `functions/`
```
functions/
├── src/
│   ├── index.ts              # Firebase callable/function exports (`setUserRole`, etc.)
│   └── scripts/
│       └── seedFirestore.ts  # CLI to seed USERS and COMPANY_SETTINGS
├── tsconfig.json
├── package.json
└── .env.example (see docs for required vars)
```

### `admin/`
```
admin/
├── src/app/            # Next.js App Router entrypoints
├── src/components/     # Layout, auth, and UI components
├── src/lib/            # Firebase config/utilities
└── package.json
```

### `client/`
```
client/
├── lib/                # Flutter business logic, models, screens
├── android/            # Android platform files
├── ios/                # iOS platform files
└── pubspec.yaml
```

## 🛠️ Technology Stack

| Area | Technologies & Libraries |
| :--- | :--- |
| **Backend** | Firebase (Authentication, Cloud Firestore, Cloud Functions, Cloud Storage), Node.js, TypeScript |
| **Mobile App** | Flutter, Dart, `geolocator`, `table_calendar`, `provider`, `firebase_core` |
| **Web Dashboard** | React, Next.js, TypeScript, Tailwind CSS, Shadcn/ui, `firebase` (Web SDK) |
| **DevOps** | Git, GitHub, Vercel (for Web App), Firebase CLI |

## 🛠️ Getting Started

### Prerequisites

- **Node.js** 22 LTS (required for Firebase Functions)
- **Flutter SDK** 3.x or later
- **Firebase CLI** `npm install -g firebase-tools`
- **Vercel CLI** `npm install -g vercel`

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/automated-attendance.git
   cd automated-attendance
   ```

2. **Install dependencies**
   ```bash
   # Admin dashboard
   cd admin
   npm install

   # Firebase functions
   cd ../functions
   npm install

   # Flutter mobile app
   cd ../client
   flutter pub get
   ```

3. **Configure Firebase project**
   - Enable Authentication (Email/Password), Firestore, and Cloud Storage.
   - Download a service-account JSON for seeding (Firebase Console → Project settings → Service accounts).

4. **Environment variables**
   - `admin/.env.local`: contains `NEXT_PUBLIC_FIREBASE_*` keys.
   - `client`: run `flutterfire configure` to generate `lib/firebase_options.dart`.
   - `functions/.env` (or `.env.local`):
     ```dotenv
     GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/service-account.json
     SEED_ADMIN_UID=your-admin-uid
     ```

5. **Seed Firestore (optional but recommended)**
   ```bash
   cd functions
   npm run seed:firestore
   ```
   This seeds `USERS/<adminUid>` and `COMPANY_SETTINGS/main`, and applies the `admin` custom claim via the service account.

6. **Run the applications**
   ```bash
   # Admin dashboard
   cd admin
   npm run dev

   # Flutter mobile app
   cd ../client
   flutter run
   ```

## 🗺️ Project Roadmap

This project is prioritized using the MoSCoW method to ensure that critical features are delivered first.

-   **✅ MVP (Must-Haves):**
    -   Secure User Authentication
    -   Core Clock-In with Geofence & Time Validation
    -   Admin Configuration of Basic Rules
    -   Basic Employee & Attendance Management

-   **🚀 V2 Features (Should-Haves):**
    -   Full Leave Request Management System
    -   Automated Violation Tracking & Penalty Calculation
    -   Real-time Notifications
    -   Admin Manual Correction of Records

-   **💡 Future Enhancements (Could-Haves):**
    -   Advanced Analytics Dashboard with Charts & PDF Reports
    -   Automated Reminder Notifications
    -   Penalty Dispute Workflow
    -   Comprehensive Audit Log Viewer

### Current Focus (Phase 4.6 – Notifications & Penalties)
-   ✅ Notifications inbox (`NotificationsScreen`, detail sheets, filters) powered by `NotificationRepository` and `markNotificationRead` callable.
-   ✅ Firebase Messaging deep-link handlers via `PushNotificationService` to open relevant routes on tap.
-   ✅ Penalties history & acknowledgement screen backed by `listEmployeePenalties` / `acknowledgePenalty`.
-   ✅ Documentation updated to capture the completed workflows and integration points.

## 📦 Deployment & Tooling

- **Firebase Functions:** `npm run build && firebase deploy --only functions`
- **Firestore Rules:** `firebase deploy --only firestore:rules`
- **Admin Dashboard:** `vercel deploy --prod`
- **Flutter App:** `flutter build appbundle` (Android) / `flutter build ipa` (iOS)
- **Data Seeding:** `cd functions && npm run seed:firestore`

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.

## ✍️ Author

**[Pan Thu]** - [https://panthu-portfolio.vercel.app/](https://panthu-portfolio.vercel.app/)
