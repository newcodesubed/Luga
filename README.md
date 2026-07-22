# Luga Wardrobe Manager

Luga is a premium, visual digital wardrobe library and AI-driven personal stylist application. It is designed with a modern luxury e-commerce aesthetic (inspired by SSENSE and Vogue) that allows users to catalog their clothing pieces, generate highly coordinated AI outfit recommendations based on occasion and weather, and save curated combinations to their personal Lookbook.

---

## Features

- **Aesthetic Closet Catalog**: Organize clothing pieces using aspect-ratio 3:4 portrait fashion cards.
- **AI Stylist Canvas**: Generates tailored look recommendations using Google's Gemini 2.5 Flash API (completely free tier).
- **Asymmetric Editorial Lookbooks**: Save your favorite generated lookbooks in an asymmetrical, Polaroid-style canvas.
- **Smart Token Optimization**: Backend serializes and compresses wardrobe details sent to LLM using index-mapping.
- **Spam & Hallucination Protection**: Built-in rate limiting and database lookup checks to verify AI-selected items.
- **Cloudflare R2 Storage**: Efficient and secure client-side direct uploads utilizing pre-signed URLs.

---

## Tech Stack

- **Frontend**: React, React Router, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Prisma ORM, Zod, PostgreSQL
- **AI Provider**: Google Gen AI SDK (Gemini 2.5 Flash) or OpenAI SDK (GPT-4o-mini)
- **Object Storage**: Cloudflare R2 (compatible with AWS S3 SDK)

---

## Getting Started

### Prerequisites
Before running the project, make sure you have:
- **Node.js** (v18+ recommended)
- **PostgreSQL** instance running locally or hosted
- **Google AI Studio Key** (Get one for free at [Google AI Studio](https://aistudio.google.com/))
- **Cloudflare R2 Bucket** (with public domain and CORS configured)

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/luga.git
cd luga
```

### 2. Database & Backend Configuration
Navigate to the `backend` directory:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# Database Settings
DB_USER=luga_admin
DB_HOST=localhost
DB_DATABASE=luga
DB_PASSWORD=admin
DB_PORT=5432
DATABASE_URL="postgresql://luga_admin:admin@localhost:5432/luga"

# Authentication Security
JWT_SECRET="your_jwt_secret_key_change_me_in_production"

# Cloudflare R2 Storage Settings
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://your_cloudflare_account_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=luga-bucket
R2_PUBLIC_DOMAIN=https://pub-your_public_domain.r2.dev

# AI Provider Settings
LLM_PROVIDER=gemini        # Options: gemini | openai
GEMINI_API_KEY=AIzaSy...  # Your free Google AI Studio Key
OPENAI_API_KEY=sk-proj... # Optional: Only if LLM_PROVIDER is set to openai
```

### 3. Initialize the Database
Apply Prisma schema migrations to sync your PostgreSQL database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Configure R2 Storage CORS Rules
To allow direct uploads from your frontend, run the CORS configuration helper script:
```bash
node scripts/configureR2Cors.js
```

---

## Running the Application

### Start the Backend
From the `backend` folder:
```bash
node index.js
```
The server will run on `http://localhost:5000`.

### Start the Frontend
In a new terminal window, navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Contributing & Forking
1. Fork this project.
2. Create a feature branch: `git checkout -b feature/NewFeature`
3. Commit your changes: `git commit -m 'Add NewFeature'`
4. Push to branch: `git push origin feature/NewFeature`
5. Open a Pull Request.
