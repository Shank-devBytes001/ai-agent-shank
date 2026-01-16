# 🤖 shank.ai - Chatbot Platform

A minimal chatbot platform that allows users to create AI agents with custom personalities and engage in conversations powered by LLM APIs.

![shank.ai](https://img.shields.io/badge/shank-ai-yellow?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-3-blue?style=flat-square)

## 🌐 Live Demo

- **Frontend:** [https://shank-ai.vercel.app](https://shank-ai.vercel.app)
- **Backend API:** [https://shank-ai-backend.onrender.com](https://shank-ai-backend.onrender.com)

## ✨ Features

- **User Authentication** - Secure JWT-based registration and login
- **Project/Agent Management** - Create multiple AI agents with custom system prompts
- **Real-time Chat** - Engage in conversations with your AI agents
- **File Uploads** - Attach files to your projects (optional feature)
- **Beautiful UI** - Modern, responsive design with dark theme

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- OpenRouter API key (free tier available at https://openrouter.ai)

### 1. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd chat-ai-yello.ai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory:

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development

# LLM API (get free key at https://openrouter.ai)
OPENROUTER_API_KEY="your-openrouter-api-key"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

### 3. Setup Database

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🌍 Deployment (Free Hosting)

### Backend → Render.com (Free)

1. **Create a Render Account** at https://render.com

2. **Create a New Web Service:**
   - Connect your GitHub repository
   - Select the `backend` directory as the root
   - Build Command: `npm install && npx prisma generate && npx prisma db push`
   - Start Command: `npm start`

3. **Add Environment Variables in Render Dashboard:**
   ```
   DATABASE_URL=file:./dev.db
   JWT_SECRET=<generate-a-strong-secret>
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   OPENROUTER_API_KEY=<your-openrouter-api-key>
   FRONTEND_URL=https://shank-ai.vercel.app
   ```

4. **Deploy** - Render will automatically build and deploy

### Frontend → Vercel (Free)

1. **Create a Vercel Account** at https://vercel.com

2. **Import your GitHub repository**

3. **Configure the project:**
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables in Vercel Dashboard:**
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

5. **Deploy** - Vercel will automatically build and deploy

### After Deployment

1. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Update the `FRONTEND_URL` in Render with this URL
3. Redeploy the backend on Render

---

## 📁 Project Structure

```
chat-ai-yello.ai/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── index.js        # App entry point
│   │   ├── lib/
│   │   │   └── prisma.js   # Database client
│   │   ├── middleware/
│   │   │   ├── auth.js     # JWT authentication
│   │   │   └── errorHandler.js
│   │   └── routes/
│   │       ├── auth.js     # Auth endpoints
│   │       ├── projects.js # Project CRUD
│   │       ├── chat.js     # Chat with LLM
│   │       └── files.js    # File uploads
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── render.yaml         # Render.com config
│
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProjectChat.jsx
│   │   │   └── ProjectSettings.jsx
│   │   └── utils/
│   │       └── api.js
│   ├── vercel.json         # Vercel config
│   └── index.html
│
├── README.md
└── ARCHITECTURE.md
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/:projectId` | Send message & get response |
| POST | `/api/chat/:projectId/stream` | Streaming response (SSE) |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/:projectId` | List project files |
| POST | `/api/files/:projectId` | Upload file |
| DELETE | `/api/files/:projectId/:fileId` | Delete file |

## 🛠 Tech Stack

**Backend:**
- Node.js + Express.js
- Prisma ORM
- SQLite (dev) / PostgreSQL (optional for production)
- JWT authentication
- OpenRouter API (LLM)

**Frontend:**
- React 19
- Vite
- Tailwind CSS
- React Router
- Lucide Icons

**Hosting:**
- Render.com (Backend - Free tier)
- Vercel (Frontend - Free tier)

## 🔐 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT token authentication
- Input validation with express-validator
- CORS protection
- Parameterized database queries (Prisma)

## 📝 License

MIT License - feel free to use this project for learning or production.

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai) for LLM API access
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Lucide](https://lucide.dev) for icons
- [Render](https://render.com) for backend hosting
- [Vercel](https://vercel.com) for frontend hosting
