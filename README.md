<div align="center">

# Studex 🎓
### Studex MERN Stack Application • Academic Workspace & Resource Platform

<p align="center">
  <em>A modern, full-stack MERN academic workspace, productivity engine, and student platform.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Gemini_AI-1.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

</div>

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack & Architecture](#️-tech-stack--architecture)
- [📁 Project Structure](#-project-structure)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [🏃 Getting Started](#-getting-started)
- [🔌 API Endpoints](#-api-endpoints)
- [🎨 UI & Design System](#-ui--design-system)
- [🧪 Scripts & Commands](#-scripts--commands)

---

## ✨ Key Features

### 1. 🚀 Studex Spaces & Collaborative Groups (`SpacesEngine` — Milestone 12)
- **Multi-Tier Academic Groups**:
  - Create spaces for **Study Groups**, **Project Teams**, **Classes/Sections**, or **Peer Circles**.
- **Role-Based Access Control (RBAC)**:
  - 👑 **Owner**: Full space authority, assign admin roles, manage space metadata, transfer ownership, or delete space.
  - 🛡️ **Admin**: Invite members, remove regular members, update space profile and rules.
  - 👤 **Member**: Participate in study sessions, view member roster, copy invite codes, and leave space.
- **Dynamic Membership Management**:
  - Create Space &rarr; Unique uppercase invite code (e.g. `SX-9A4B2C`).
  - Join via Invite Code or 1-Click Public Discovery directory.
  - Member search and direct invite by student email / UID.
  - Member removal & role updates with authorization checks.

### 2. ✨ Studex AI Assistant & Context-Aware Planner (`StudexAIEngine`)
- **Deep Academic Context Synthesis**:
  - Instead of a generic chatbot, Studex AI feeds the student's real-time database context (enrolled subjects, pending tasks, exam countdowns, weekly study velocity, and streak momentum) directly into Google Gemini.
- **Personalized Time-Blocked Study Roadmaps**:
  - Input: *"I have 3 hours tonight"* &rarr; Studex AI factorizes upcoming exams (e.g. DBMS in 2 days) and pending assignments (e.g. Networks due tomorrow) to build a concrete, prioritized, Pomodoro-blocked schedule.
- **Conversational Academic Strategist**:
  - Ask for habit diagnoses, study velocity checks, active recall strategies, and subject prioritization.
- **AI Task & Exam Deconstruction**:
  - Break down intimidating final projects or exam syllabi into 3-5 manageable micro-tasks with 1-click database saving to the Task Engine.

### 2. 🏠 Home Command Center (`HomeDashboard`)
- **Personalized Student Spotlight**: Context-aware greetings, inspiring daily study quotes, and enrolled academic tags (College, Major, Enrolled Subjects count).
- **Weekly Momentum At a Glance**:
  - ⏱️ **Study Time**: Real-time weekly study hours vs. targets with interactive progress bars.
  - ✅ **Tasks Finished**: Total completed tasks and weekly completion percentages.
  - ⭐ **Consistency & Streak**: Active day tracking (e.g. 5 of 7 days) and current day streaks.
- **Daily & Weekly Streak Spotlight**: Visual streak progress bars and instant generation of shareable student streak cards.
- **2-Column Productivity Dashboard**:
  - Daily tasks quick-list with instant completion toggles.
  - Quick Pomodoro focus session launcher.
  - Interactive shortcuts bar.
  - Upcoming exams, assignments, and deadlines preview.
  - Pinned study materials for quick access.

### 2. 📚 Academic Workspace (`AcademicWorkspace`)
- **Enrolled Subjects Hub**: Categorize coursework by custom subject codes, names, credits, and professor tags.
- **Multi-Format Resource Library**: Upload, pin, search, and filter study materials:
  - 📄 Lecture slides and PDFs
  - 🖼️ Diagrams and handwritten notes
  - 🔗 Web bookmarks, documentation links, and video resources
- **Cloudinary Cloud Delivery**: High-speed, secure cloud storage for documents, diagrams, and files.

### 3. 📝 Task Engine (`TaskEngine`)
- **Priority-Based Task Organization**: High, Medium, and Low priority sorting with deadline countdowns.
- **Smart Filtering**: Filter by status (*All*, *Pending*, *In Progress*, *Completed*), subject tag, or search term.
- **Important / Starred Tasks**: Instant pinning of critical assignments into a dedicated drawer.

### 4. ⏱️ Focus Study Engine (`StudyEngine`)
- **Pomodoro & Focus Timer**: Standard 25-minute Pomodoro, 50-minute deep focus, 15-minute quick sprint, or custom minute intervals.
- **Automatic Study Logging**: Completed sessions automatically log to MongoDB, updating weekly targets, streaks, and subject velocity.
- **Subject-Linked Sessions**: Associate study time directly to enrolled courses.

### 5. 📈 Analytics & Progress Tracking (`AnalyticsDashboard`)
- **Study Velocity & Goals**: Monitor weekly study target progress and study session consistency.
- **Subject Distribution**: Visualize time spent across different enrolled subjects.
- **Task Velocity & Trends**: Completion rates and productivity metrics.

### 6. 🏆 Gamification & Streaks (`GamificationEngine`)
- **Streak Tracker**: Daily study streaks, target checkpoints, and streak history.
- **XP & Leveling System**: Earn experience points for studying, completing tasks, and uploading resources.
- **Achievement Badges**: Unlock milestones (e.g., *Night Owl*, *Consistency Champion*, *Task Master*).
- **Shareable Streak Card Generator**: Export stylish student achievement summaries.

### 7. 📅 Academic Planner & Quick Modals
- **Interactive Calendar Modal**: Full monthly calendar grid with event scheduling, category tags, and important date markers.
- **Upcoming Deadlines Modal**: Chronological timeline of exams, project submissions, and homework.
- **Quick Modals**: Fast sidebar-triggered popups for pinning resources and launching focus sessions.

### 8. 👤 Student Profile & Account Hub (`ProfileModal` & `NavbarProfileDropdown`)
- **2x2 Academic Matrix**: Student UID, College/University, Course/Major, and Academic Year.
- **Avatar Customization**: Switch between curated avatar presets, custom image URLs, or file uploads.
- **Live System Health**: Real-time status indicators for API server and MongoDB connection.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: React 19 + Vite 8
- **Styling**: Custom CSS3 Claymorphism / Glassmorphism with CSS Variables & Dark/Light Themes
- **Icons**: Custom SVG vector icon suite

### Backend
- **Runtime & Framework**: Node.js & Express 5 (REST API)
- **Database**: MongoDB with Mongoose 9 ODM
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs password hashing
- **File & Media Storage**: Cloudinary Cloud API & Multer multipart upload middleware
- **Architecture**: Clean MVC Pattern (`Routes` &rarr; `Controllers` &rarr; `Models` &rarr; `Middleware`)

---

## 📁 Project Structure

```text
Studex/
├── client/                     # React 19 Frontend (Vite)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Modular feature components
│   │   │   ├── AcademicWorkspace.jsx     # Subjects & resource management
│   │   │   ├── AnalyticsDashboard.jsx    # Learning metrics & velocity charts
│   │   │   ├── AuthModal.jsx             # Authentication gateway modal
│   │   │   ├── CalendarModal.jsx         # Monthly academic planner
│   │   │   ├── GamificationEngine.jsx    # XP, streaks & achievement badges
│   │   │   ├── HomeDashboard.jsx         # Main student command center
│   │   │   ├── Icons.jsx                 # Centralized SVG icon suite
│   │   │   ├── NavbarProfileDropdown.jsx # Quick account & server health menu
│   │   │   ├── ProfileModal.jsx          # Student academic profile & avatar drawer
│   │   │   ├── QuickAddResourceModal.jsx # Fast resource upload popup
│   │   │   ├── QuickFocusSessionModal.jsx# Fast Pomodoro timer modal
│   │   │   ├── Sidebar.jsx               # Collapsible floating navigation rail
│   │   │   ├── StarredTasksModal.jsx     # Priority tasks drawer
│   │   │   ├── StudyEngine.jsx           # Focus session timer & study logger
│   │   │   ├── TaskEngine.jsx            # Student task management
│   │   │   └── UpcomingEventsModal.jsx   # Upcoming deadlines & exams timeline
│   │   ├── App.jsx             # Root layout, navigation router & global state
│   │   ├── App.css             # Component styling & design tokens
│   │   ├── index.css           # Global theme variables (Dark/Light) & resets
│   │   └── main.jsx            # React application entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Express 5 Backend REST API
│   ├── config/
│   │   ├── db.js               # Resilient MongoDB connection logic
│   │   └── cloudinary.js       # Cloudinary cloud storage configuration
│   ├── controllers/            # Route controllers & business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── subjectController.js
│   │   ├── resourceController.js
│   │   ├── taskController.js
│   │   ├── calendarController.js
│   │   ├── studySessionController.js
│   │   ├── analyticsController.js
│   │   ├── streakController.js
│   │   └── courseController.js
│   ├── middleware/             # Express middlewares
│   │   ├── authMiddleware.js   # JWT verification & route protection
│   │   ├── uploadMiddleware.js # Multer multipart handler
│   │   └── errorMiddleware.js  # 404 & centralized error handler
│   ├── models/                 # Mongoose schemas
│   │   ├── User.js
│   │   ├── Subject.js
│   │   ├── Resource.js
│   │   ├── Task.js
│   │   ├── CalendarEvent.js
│   │   ├── StudySession.js
│   │   ├── Streak.js
│   │   └── Course.js
│   ├── routes/                 # Express API route endpoints
│   ├── .env.example            # Backend environment template
│   ├── package.json
│   └── server.js               # Express application entry & route registration
│
├── package.json                # Root workspace configuration
└── README.md                   # Documentation
```

---

## ⚙️ Environment Configuration

1. In the `server` directory, create a `.env` file based on `.env.example`:

```bash
cp server/.env.example server/.env
```

2. Fill in your environment variables:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/studex
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173

# Optional: Cloudinary Cloud Storage (for file & profile image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🏃 Getting Started

### 1. Install Dependencies

From the project root:

```bash
# Install both backend and frontend dependencies
npm run install:all
```

Or individually:

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Start the Backend API

```bash
# From the root directory:
npm run server

# Or from the server directory:
cd server
npm run dev
```

The server will start on **http://localhost:5000**.

### 3. Start the Frontend Client

```bash
# In a separate terminal, from the root directory:
npm run client

# Or from the client directory:
cd client
npm run dev
```

The Vite dev server will start on **http://localhost:5173**.

---

## 🔌 API Endpoints

### 🩺 System & Health
- `GET /api/health` - Server health, uptime, and database connection status.

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new student account.
- `POST /api/auth/login` - Authenticate student and issue JWT token.
- `GET /api/auth/me` - Fetch authenticated student session *(Protected)*.

### 👤 Student Profiles (`/api/users`)
- `GET /api/users/me` - Get current student profile *(Protected)*.
- `PUT /api/users/me` - Update college, major, year, and subjects *(Protected)*.
- `POST /api/users/profile-image` - Upload profile avatar to Cloudinary *(Protected)*.

### 📚 Subjects & Resources (`/api/subjects` & `/api/resources`)
- `GET /api/subjects` - List all enrolled subjects *(Protected)*.
- `POST /api/subjects` - Create a new subject *(Protected)*.
- `DELETE /api/subjects/:id` - Delete a subject *(Protected)*.
- `GET /api/resources` - List resources with search, subject, and type filters *(Protected)*.
- `POST /api/resources` - Upload document / add resource link *(Protected)*.
- `DELETE /api/resources/:id` - Delete a resource *(Protected)*.

### 📝 Tasks (`/api/tasks`)
- `GET /api/tasks` - List tasks with status, priority, and subject filters *(Protected)*.
- `GET /api/tasks/today` - List tasks scheduled for today *(Protected)*.
- `POST /api/tasks` - Create a new task *(Protected)*.
- `PATCH /api/tasks/:id` - Update task status / details *(Protected)*.
- `DELETE /api/tasks/:id` - Delete a task *(Protected)*.

### ⏱️ Study Sessions & Streaks (`/api/study-sessions` & `/api/streaks`)
- `GET /api/study-sessions` - List logged focus sessions *(Protected)*.
- `POST /api/study-sessions` - Record completed focus session *(Protected)*.
- `GET /api/study-sessions/stats` - Fetch weekly study statistics *(Protected)*.
- `GET /api/streaks` - Fetch current daily and weekly streak milestones *(Protected)*.

### 📅 Calendar & Events (`/api/calendar`)
- `GET /api/calendar` - Fetch monthly planner items *(Protected)*.
- `GET /api/calendar/upcoming` - Fetch upcoming exams and deadlines *(Protected)*.
- `POST /api/calendar` - Schedule a new calendar event *(Protected)*.
- `PATCH /api/calendar/:id/toggle-important` - Toggle star / important flag *(Protected)*.
- `DELETE /api/calendar/:id` - Remove a calendar event *(Protected)*.

---

## 🎨 UI & Design System

Studex features a **Cute, Glossy Claymorphic & Glassmorphic Design System**:
- **Dual Themes**: Complete Dark Mode and Light Mode support with smooth CSS transitions.
- **Glassmorphic Canvas**: Translucent page containers and layered frosted cards.
- **Solid High-Contrast Modals**: Focused, distraction-free popup dialogs with clear contrast.
- **Responsive Navigation**: Collapsible icon rail with quick modals and pill navigation.

---

## 🧪 Scripts & Commands

| Command | Description |
|---|---|
| `npm run install:all` | Installs dependencies for both server and client |
| `npm run server` | Starts the Express server with Nodemon on port 5000 |
| `npm run client` | Starts the Vite React dev server on port 5173 |
| `npm run client:build` | Compiles frontend production build |
| `npm run client:lint` | Runs ESLint on the client codebase |

---

## 📄 License

This project is licensed under the ISC License.