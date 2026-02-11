# Enkryx - Private Team Meeting App

A lightweight, private team application with real-time chat, file sharing, and video calling.

## Tech Stack
- **Frontend:** React (Vite), JavaScript, Plain CSS.
- **Backend:** Firebase (Firestore, Storage, Anonymous Auth).
- **Video:** Jitsi Meet External API (via JaaS 8x8.vc).
- **Hosting:** Vercel.

## Setup Instructions

### 1. Firebase Setup
1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Enable **Anonymous Authentication** in the Auth section.
3. Create a **Firestore Database**.
4. Create a **Storage Bucket**.
5. Copy your Firebase config and paste it into a `.env` file (see `.env.example`).

### 2. DNS & Vercel Deployment
1. Push this repo to GitHub.
2. Connect the repo to Vercel.
3. Set Environment Variables in Vercel matching your `.env`.
4. Add domain `meet.enkryx.com` in Vercel.
5. Add a CNAME record in your DNS provider:
   - **Type:** CNAME
   - **Name:** meet
   - **Value:** cname.vercel-dns.com

### 3. Local Development
```bash
npm install
npm run dev
```

## Features
- **Passcode Protection:** Enter meeting with passcode `192288`.
- **3-User Limit:** Maximum 3 users allowed in the meeting at once.
- **Anonymous Auth:** No account needed, just a display name.
- **Real-time Chat:** Messages sync instantly via Firestore.
- **File Sharing:** Upload files up to 50MB.
- **Presence:** See who's online in real-time.
- **Video Calls:** High-quality 8x8.vc (JaaS) calls with no time limits.

## Scripts
- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run preview`: Preview production build.
