# ORBEM Solutions

Customer Invoice and Payment Tracker

## Tech Stack

- React
- Node.js
- Express
- MySQL
- JWT Authentication

## Features

- Customer Management
- Invoice Generation
- Payment Tracking
- Dashboard
- Email Notifications
- PDF Invoice Generation

## Installation

Backend

cd backend
npm install
npm start

Frontend

cd frontend
npm install
npm start

## Backend Environment

Create a `backend/.env` file with these values:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `PORT`
- `EMAIL_USER` (required for SMTP or default sender)
- `EMAIL_PASS` (required for SMTP)
- `EMAIL_FROM` (optional, defaults to `EMAIL_USER`)
- `BREVO_API_KEY` (optional; if set, the app uses Brevo API instead of SMTP)
- `EMAIL_HOST` (optional; defaults to `smtp-relay.brevo.com`)
- `EMAIL_PORT` (optional; defaults to `587` for Brevo SMTP)

If Render blocks SMTP outbound connections, set `BREVO_API_KEY` and the app will send email through Brevo API instead of SMTP.