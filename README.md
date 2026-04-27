# Complaint Management System (CMS)

A full-stack college complaint management portal built with React + Vite + Firebase.

## Quick Start

1. Clone / unzip the project
2. Run `npm install`
3. Edit `src/firebase.js` with your Firebase config
4. Run `npm run dev`

See full setup instructions below.

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3 (Neo-brutalism design system)
- **Routing**: React Router v6
- **Backend**: Firebase (Auth + Firestore + Storage) — Free Spark tier
- **Charts**: Recharts
- **Icons**: Lucide React

## Setup Instructions

### 1. Firebase Project
Go to https://console.firebase.google.com → Add project

### 2. Enable Services
- Authentication → Email/Password
- Firestore Database → Create in test mode
- Storage → Get started in test mode

### 3. Add Firebase Config to src/firebase.js
Project Settings → Your apps → Web → Copy firebaseConfig

### 4. Create Admin User
Firebase Console → Authentication → Add user → copy UID
Firestore → users collection → Add document with ID = UID
Fields: name, email, role:"admin", department, createdAt

### 5. Apply Security Rules
Paste firestore.rules into Firestore Rules tab
Paste storage.rules into Storage Rules tab

## Routes
- / — Student login/signup
- /dashboard — Student portal
- /admin — Admin login
- /admin/dashboard — Admin panel (Dashboard, Complaints, Analytics tabs)
