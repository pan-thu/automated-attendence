# Automated Attendance Management System

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)![Flutter](https://img.shields.io/badge/Flutter-3.x-blue)![React](https://img.shields.io/badge/React-18.x-61DAFB)![Firebase](https://img.shields.io/badge/Firebase-v9-orange)![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

An enterprise-grade, serverless attendance management system designed to eliminate manual tracking and provide robust, secure, and configurable attendance logic for modern businesses. This project features a cross-platform mobile app for employees and a comprehensive web dashboard for administrators.

## 🌟 Key Features

The system is designed with a two-role architecture: **Employee** and **Admin**.

| Employee Features (Flutter Mobile App)                                                                   | Admin Features (React Web Dashboard)                                                                        |
| :------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| 📲 **Secure Clock-In/Out:** Geofence-validated, multi-check attendance recording.                        | ⚙️ **Dynamic System Configuration:** Manage geofence, time windows, and penalty rules without code changes. |
| 🗓️ **Attendance Calendar:** View detailed daily and monthly attendance history.                          | 👥 **Full Employee Management:** Onboard, view, edit, and deactivate user accounts.                         |
| ✈️ **Leave Management:** Submit and track leave requests (Full, Half, Medical).                          | 审批 **Leave Approval Workflow:** Review, approve, or reject employee leave requests.                       |
| 📂 **Document Upload:** Attach medical certificates or other documents to leave requests.                | 👁️ **Comprehensive Oversight:** View real-time attendance data for all employees.                           |
| 🔔 **Real-time Notifications:** Receive updates on leave status and system announcements.                | ✏️ **Manual Record Correction:** Add or edit attendance records with a mandatory audit reason.              |
| 💰 **Penalty & Violation Tracking:** Monitor personal attendance violations and any resulting penalties. | 📈 **Analytics & Reporting:** Generate and view monthly reports on company-wide attendance trends.          |

## 🏗️ System Architecture

The project is built on a secure and scalable client-server architecture, with Firebase acting as the serverless backend. All business-critical logic is centralized in Firebase Cloud Functions, making the clients responsible for UI/UX while the backend handles all validation and data processing.

_(This is a placeholder image. You would replace this with a screenshot of the Mermaid diagram from your documentation.)_

For more detailed diagrams and documentation, please see the `/docs` folder, which includes:

- `technical.md`: The main technical specification.
- `geofencing.md`: A deep dive into the geofencing logic.
- `use_cases.md`: Detailed use case diagrams and descriptions.

## 🛠️ Technology Stack

| Area              | Technologies & Libraries                                                                        |
| :---------------- | :---------------------------------------------------------------------------------------------- |
| **Backend**       | Firebase (Authentication, Cloud Firestore, Cloud Functions, Cloud Storage), Node.js, TypeScript |
| **Mobile App**    | Flutter, Dart, `geolocator`, `table_calendar`, `firebase_core`, `cloud_functions`               |
| **Web Dashboard** | React, Next.js, TypeScript, Tailwind CSS, Shadcn/ui, React-Leaflet, `firebase` (Web SDK)        |
| **DevOps**        | Git, GitHub, Vercel (for Web App), Firebase CLI                                                 |

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- **Node.js** (v18 or later)
- **Flutter SDK** (v3.x or later)
- **Firebase CLI:** `npm install -g firebase-tools`
- **Vercel CLI:** `npm install -g vercel`

### Installation & Setup

1.  **Clone the repositories** (assuming separate repos for web and mobile):

    ```bash
    git clone https://github.com/your-username/attendance-app-mobile.git
    git clone https://github.com/your-username/attendance-app-dashboard.git
    ```

2.  **Set up the Firebase Project:**

    - Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    - Enable **Authentication** (Email/Password method).
    - Create a **Cloud Firestore** database.
    - Enable **Cloud Storage**.
    - Upgrade your project to the **Blaze (Pay-as-you-go) plan**. This is required to use Cloud Functions, but you will not be charged as long as you stay within the generous free tier.

3.  **Configure Environment Variables:**

    - In your Firebase project settings, find your Firebase config keys for a **Web App**.
    - In the root of your `attendance-app-dashboard` project, create a `.env.local` file:
      ````dotenv
      # .env.local.example
      NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
      NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
      ```    - Follow the `flutterfire configure` command to set up Firebase for your Flutter project, which will generate the necessary configuration files.
      ````

4.  **Install Dependencies:**

    - For the Web Dashboard:
      ```bash
      cd attendance-app-dashboard
      npm install
      ```
    - For the Mobile App:
      ```bash
      cd attendance-app-mobile
      flutter pub get
      ```

5.  **Run the Applications:**
    - To start the Web Dashboard:
      ```bash
      npm run dev
      ```
    - To run the Mobile App on a connected device or emulator:
      ```bash
      flutter run
      ```

## 🚢 Deployment

- **Backend (Firebase):**

  - Deploy Cloud Functions, Firestore rules, and storage rules using the Firebase CLI from within the backend functions folder.
    ```bash
    firebase deploy
    ```

- **Web Dashboard (Vercel):**

  - The project is configured for seamless deployment on Vercel. Push your code to a GitHub repository and link it to a Vercel project. For manual deployments:
    ```bash
    vercel deploy --prod
    ```

- **Mobile App (Flutter):**

  - Build the release version and deploy it to the respective app stores.

    ```bash
    # For Android
    flutter build appbundle

    # For iOS
    flutter build ipa
    ```

## 🗺️ Project Roadmap

This project is prioritized using the MoSCoW method to ensure that critical features are delivered first.

- **✅ MVP (Must-Haves):**

  - Secure User Authentication
  - Core Clock-In with Geofence & Time Validation
  - Admin Configuration of Basic Rules
  - Basic Employee & Attendance Management

- **🚀 V2 Features (Should-Haves):**

  - Full Leave Request Management System
  - Automated Violation Tracking & Penalty Calculation
  - Real-time Notifications
  - Admin Manual Correction of Records

- **💡 Future Enhancements (Could-Haves):**
  - Advanced Analytics Dashboard with Charts & PDF Reports
  - Automated Reminder Notifications
  - Penalty Dispute Workflow
  - Comprehensive Audit Log Viewer

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.

## ✍️ Author

**Pan Thu** - [https://panthu-portfolio.vercel.app/](https://panthu-portfolio.vercel.app/)
