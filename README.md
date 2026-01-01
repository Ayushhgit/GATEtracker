# GATE Tracker

A personal GATE CSE preparation tracker mobile app with AI-powered planning, task management, and mentoring.

## Features

- **AI-Powered Planning**: Paste your long-term study plan and let AI convert it into daily actionable tasks
- **Smart Task Management**: Create, edit, complete, and reschedule tasks with intelligent suggestions
- **Progress Tracking**: Visual charts and statistics for subject-wise and daily progress
- **LLM Mentor Chatbot**: Get personalized study advice, motivation, and schedule modifications
- **Automated Insights**: AI-generated insights about weak subjects, consistency, and study patterns
- **Weekly/Daily Views**: Organized views of your study schedule

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Async ORM with SQLite
- **Groq API** - LLM integration (LLaMA 3.1)
- **Pydantic** - Data validation

### Frontend
- **React Native (Expo)** - Cross-platform mobile app
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **react-native-chart-kit** - Progress visualization

## Project Structure

```
GATEtracker/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Config, security
│   │   ├── db/              # Database setup
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # LLM service
│   │   └── main.py          # FastAPI app
│   ├── requirements.txt
│   └── .env.example
│
├── mobile/
│   ├── app/                 # Expo Router screens
│   │   ├── (tabs)/          # Tab screens
│   │   └── task/            # Task detail screens
│   ├── components/          # Reusable components
│   ├── contexts/            # React contexts
│   ├── services/            # API client
│   ├── types/               # TypeScript types
│   ├── constants/           # App constants
│   ├── package.json
│   └── app.json
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone
- Groq API key (free at https://console.groq.com)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```
   GROQ_API_KEY=your-groq-api-key
   USER_PIN=your-secret-pin
   SECRET_KEY=your-random-secret-key-min-32-chars
   ```

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   API docs at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL**

   Edit `constants/index.ts`:
   ```typescript
   // For local development (same network)
   export const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000/api';

   // For production
   export const API_BASE_URL = 'https://your-deployed-backend.com/api';
   ```

4. **Start Expo**
   ```bash
   npx expo start
   ```

5. **Run on your phone**
   - Scan the QR code with Expo Go app
   - Or press `a` for Android emulator / `i` for iOS simulator

### Deployment

#### Backend Deployment (Railway/Render/Fly.io)

1. Push your code to GitHub
2. Connect to Railway/Render
3. Set environment variables:
   - `GROQ_API_KEY`
   - `USER_PIN`
   - `SECRET_KEY`
   - `DATABASE_URL` (if using PostgreSQL)

#### Mobile App (APK/IPA Build)

```bash
# Build APK for Android
npx expo build:android

# Or use EAS Build
npx eas build --platform android
```

## Usage

### 1. Login
Use the PIN you configured in `.env` (default: `123456`)

### 2. Generate Study Plan
1. Go to Dashboard → "Generate Plan"
2. Paste your GATE preparation roadmap
3. Set date range
4. Click "Generate Tasks with AI"

### 3. Daily Workflow
1. Check Dashboard for today's tasks
2. Complete tasks by tapping the checkbox
3. View weekly schedule in Week tab
4. Track progress in Progress tab

### 4. Get AI Mentoring
1. Go to Mentor tab
2. Ask questions like:
   - "What should I study today?"
   - "Why am I falling behind?"
   - "Replan my week"
   - "Generate study insights"

## Example Plan Input

```
GATE CSE 2025 Preparation - 8 Month Plan

Phase 1 (Month 1-2): Foundation
- Week 1-2: C Programming basics, pointers, arrays
- Week 3-4: Data Structures basics - Arrays, Linked Lists
- Week 5-6: Stacks, Queues, Trees fundamentals
- Week 7-8: Discrete Mathematics - Sets, Relations, Functions

Phase 2 (Month 3-4): Core Subjects
- Operating Systems: Process, Memory, File management
- DBMS: SQL, Normalization, Transactions
- Computer Networks: OSI, TCP/IP, Routing

Phase 3 (Month 5-6): Advanced Topics
- Theory of Computation: Automata, CFG, Turing Machines
- Compiler Design: Lexical, Parsing, Code generation
- Computer Architecture: Pipelining, Cache, Memory

Phase 4 (Month 7-8): Revision & Practice
- Previous year question practice
- Full-length mock tests
- Topic-wise revision of weak areas
```

## Example Chatbot Queries

- "What topics should I focus on today?"
- "I skipped 3 tasks yesterday, please reschedule them"
- "Analyze my progress and tell me weak areas"
- "Create revision tasks for Operating Systems"
- "Why is my completion rate dropping?"
- "Plan next week focusing on DBMS and CN"

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with PIN |
| `/api/dashboard` | GET | Dashboard data |
| `/api/tasks` | GET/POST | List/Create tasks |
| `/api/tasks/today` | GET | Today's tasks |
| `/api/tasks/week` | GET | Week's tasks |
| `/api/tasks/{id}` | GET/PUT/DELETE | Task CRUD |
| `/api/tasks/{id}/status` | PATCH | Update status |
| `/api/progress/summary` | GET | Progress stats |
| `/api/insights` | GET | Get insights |
| `/api/insights/generate` | POST | Generate AI insights |
| `/api/chat` | POST | Chat with mentor |
| `/api/planner/create-from-plan` | POST | Parse plan to tasks |

## Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key | Required |
| `USER_PIN` | Login PIN | `123456` |
| `SECRET_KEY` | JWT secret | Required |
| `DATABASE_URL` | Database connection | SQLite |
| `GROQ_MODEL` | LLM model | `llama-3.1-70b-versatile` |

### Frontend
| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend API URL |

## Security Notes

- This is a **single-user** app - no public registration
- Change the default PIN in production
- Use a strong SECRET_KEY
- Deploy backend with HTTPS
- The PIN is not hashed by default (add bcrypt for production)

## Troubleshooting

**Backend not connecting?**
- Ensure backend is running on `0.0.0.0:8000`
- Check if your phone and computer are on the same network
- Use your computer's local IP, not `localhost`

**API errors?**
- Check Groq API key is valid
- Verify environment variables are set
- Check backend logs for errors

**Expo not loading?**
- Clear Expo cache: `npx expo start -c`
- Reinstall node_modules

## License

Personal use only. Built for GATE CSE preparation.
