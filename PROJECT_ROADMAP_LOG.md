# 🚀 StudyVerse AI Learning OS — Feature History & Master Roadmap

This document serves as the **official project ledger** tracking all implemented features, database migrations, and upcoming technical phases for **StudyVerse**.

---

## 📌 Executive Summary & Architectural Overview

```
                                ┌────────────────────────────────────────┐
                                │        StudyVerse Master Engine        │
                                └───────────────────┬────────────────────┘
                                                    │
        ┌───────────────────────┬───────────────────┴───────────────────┬───────────────────────┐
        ▼                       ▼                                       ▼                       ▼
 ┌──────────────┐    ┌───────────────────┐                   ┌───────────────────┐   ┌───────────────────┐
 │ Multi-Subject│    │  Grounded RAG     │                   │ Cognitive Analytics│   │ Accessibility &   │
 │ Parallel Tracks    │  & Material Gen   │                   │ & FSRS Telemetry  │   │ Equity Engine     │
 └──────────────┘    └───────────────────┘                   └───────────────────┘   └───────────────────┘
   [COMPLETED]           [COMPLETED]                             [UPCOMING]              [UPCOMING]
```

---

## ✅ SECTION 1: IMPLEMENTED FEATURES & COMPLETED PHASES

### 🚩 Phase 1: Multi-Subject Parallel Tracks & Focus Workspace (Completed)
- [x] **Multi-Subject Track Engine**: Students can create and manage multiple active study tracks simultaneously (*e.g., DSA at Night, Physics in the Morning*).
- [x] **Syllabus & Course Material Ingestion**: Onboarding and track creation flow allows pasting raw syllabus text, lecture outlines, or exam dates.
- [x] **Chronotype Time-Slot Preferences**: Support for selecting preferred time slots (`morning`, `afternoon`, `evening`, `night`, `flexible`) with custom UI badges on the dashboard.
- [x] **Subject Switcher & Dynamic Dashboard**: Quick-switch active tracks directly from the mission dashboard with instant progress tracking.
- [x] **Publication-Grade Typography Engine (`FormattedText.tsx`)**:
  - Strips raw markdown syntax (`####`, `**`, `+`, `*`) into structured UI section cards, callouts, and clean headings.
- [x] **Dual-Mode Interactive Flashcard Deck (`FlashcardDeck.tsx`)**:
  - **Grid View Mode**: Renders 4–6 high-contrast gradient cards on one screen simultaneously with individual flip animations.
  - **Single Focus Deck Mode**: 3D flip active-recall card deck for deep focus.
- [x] **Distraction-Free Fullscreen Focus Workspace**:
  - Automatically triggers browser full-screen focus mode on starting a lesson.
  - Manual fullscreen toggle button in session header.
  - Separate AI Lesson Guide vs. Private Student Notebook (with **Save**, **Export .txt**, and **Clear** actions).
- [x] **Clean Brand Identity**: Replaced generic AI sparkles with custom domain icons (`GraduationCap`, `BookOpen`, `Bot`, `Zap`, `BrainCircuit`) and custom StudyVerse SVG favicon.

---

### 🧠 Phase 2: Grounded RAG Pipeline & Visual Flowcharts (Completed)
- [x] **Vector Database Architecture (`document_chunks`)**:
  - Database migration (`20260731020000_rag_document_chunks.sql`) with Supabase RLS security policies and similarity search RPC (`match_document_chunks`).
- [x] **RAG Retrieval Engine (`rag.server.ts`)**:
  - Server-side document chunking service (500-character overlapping chunks) with vector embeddings.
  - Grounded similarity retrieval (`getGroundedContext`) for AI prompts.
- [x] **Grounded Source Page Citations**:
  - AI Lesson Guides, Flashcards, and Quizzes query `document_chunks` first, attaching exact page/section citations (*e.g., `[Source: Chapter 3 Notes.pdf, Page 2]`*).
- [x] **Course Material Upload Panel**:
  - Direct textbook / slide text ingestion card in the Focus Session Resources tab.
- [x] **Mermaid.js Visual Concept Maps (`MermaidDiagram.tsx`)**:
  - Dynamic client-side rendering of visual flowcharts and mindmaps directly inside lesson notes.
  - Built-in syntax validation, error suppression, and clean fallback rendering.

---

### 🎓 Phase 2.5: Official University Courses & Instructor PDF Personalization (Completed)
- [x] **RBAC Database Migration (`20260801000000_rbac_courses_enrollments.sql`)**:
  - `profiles.role` (`'student'`, `'instructor'`, `'admin'`).
  - `courses` & `course_enrollments` tables.
- [x] **Courses Directory (`courses.tsx`)**:
  - Universal course catalog for all learners with category pills.
  - 1-click enrollment for students.
- [x] **Instructor Course Creator Modal**:
  - Teachers/Admins can publish courses and ingest syllabus text & PDF textbooks into RAG vector store.

---

### 🛡️ Phase 2.8: Platform Admin Console & AI Engine Control Center (Completed)
- [x] **System Settings Migration (`20260801010000_system_settings.sql`)**:
  - Key-value schema persisting AI model, RAG match threshold, match count, maintenance mode, and announcements.
- [x] **Admin Server Functions (`admin.functions.ts`)**:
  - Telemetry counters, User Directory queries, 1-click role promotions, course moderation queue, and vector storage vacuum.
- [x] **Platform Admin Console (`/admin`)**:
  - **📊 System Telemetry**: Metric cards for Users, Published Courses, Enrollments, Vector RAG Chunks, and Role Counts.
  - **👥 User Directory**: Searchable table with instant role promotion dropdowns.
  - **📑 Course Moderation Queue**: Review queue to publish or archive courses.
  - **⚙️ AI Engine Control Panel**: Master switches for AI Model (`Groq / Llama 3.3 70B`, `Gemini 1.5 Pro`, `GPT-4o`) and sliders for `match_threshold` & `match_count`.
  - **🛠️ Maintenance & Reports**: Report Export Studio (CSV/JSON), Vector Storage Vacuum, and Emergency Announcement Broadcast.

## ⏳ SECTION 2: UPCOMING MASTER PHASES

### 📊 Phase 3: Cognitive Telemetry & FSRS Spaced Repetition Engine (Next Master Phase)
- [ ] **FSRS-4.5 Scheduling Engine (`fsrs.ts`)**:
  - Advanced Spaced Repetition calculation based on item stability, retrievability, and difficulty score.
- [ ] **Behavioral Telemetry Logging (`study_behavior_logs`)**:
  - Track active recall latency (time taken to flip cards or answer quiz questions), focus idle times, and rage skips.
- [ ] **Adaptive Study Notifications**:
  - Intelligent reminders based on student chronotype curves (*"Your memory retention for Data Structures is dipping — 5 min review recommended"*).

---

### ♿ Phase 4: Inclusivity, Accessibility & Neurodivergent Focus Modes
- [ ] **ADHD Micro-Chunking Mode**:
  - Breaks 30-minute study topics into 5-minute bite-sized gamified focus sprints.
- [ ] **Dyslexia & Reading Accessibility Suite**:
  - OpenDyslexic font toggle, Bionic Reading (highlighting initial letters of words), and High-Contrast dark mode.
- [ ] **Voice Note Lecture Recorder & TTS**:
  - Record live audio lectures directly into the workspace with automatic transcript chunking.
  - Text-to-Speech audio reader for lesson notes.

---

### 🌐 Phase 5: Zero-Material Equity Engine & Community Study Verse Hub
- [ ] **Photo OCR Textbook Scanner**:
  - Snap photo of paper textbooks or handwritten notes to instantly digitize and create vector-searchable study tracks.
- [ ] **Instant Curriculum Presets**:
  - Pre-built curriculum trees for standard subjects (*OpenStax, CBSE, SAT, AP Physics, Computer Science*).
- [ ] **Public Study Verse Hub**:
  - Community marketplace to publish and clone high-yield flashcard decks and study roadmaps from peers.

---

## 📝 SECTION 3: USER CUSTOM WISHLIST & BACKLOG

*Custom features requested by Professor & Student for upcoming sprint:*

1. **🎬 Interactive Concept Animations & Algorithmic Visual Simulators (Professor Directive)**:
   - Client-side Canvas / SVG step-by-step animation player (`TopicAnimator.tsx`) with Play, Pause, Scrub, and Speed controls.
   - Generates interactive visual simulations for complex topics (*e.g., Traveling Salesperson Problem graph visits, Sorting swaps, Linked List pointer updates, Binary Tree traversals, Control Flow decision trees*).
   - Allows students to visualize how algorithms execute step-by-step rather than just reading static text.
2. **[Pending Input]**: Additional custom feature requests...

---

## 📁 File Structure & Core System Files

```
StudyVerse/
├── src/
│   ├── components/
│   │   ├── study/
│   │   │   ├── FlashcardDeck.tsx      # Dual-mode Grid & Focus card deck
│   │   │   ├── QuizModal.tsx          # Practice Quiz modal with source citations
│   │   │   └── CreateTrackModal.tsx   # Multi-subject track creation modal
│   │   ├── ui/
│   │   │   ├── FormattedText.tsx      # Publication-grade typography parser
│   │   │   └── MermaidDiagram.tsx     # Client-side Mermaid flowchart renderer
│   │   └── tools/
│   │       └── CodingPlayground.tsx   # Interactive code sandbox
│   ├── lib/
│   │   ├── ai.functions.ts            # AI server functions (Roadmap, Notes, Tutor, Quiz, Cards)
│   │   ├── rag.server.ts              # RAG document chunking & vector search service
│   │   └── progress.functions.ts      # Activity logging & session telemetry
│   └── routes/
│       ├── _authenticated/
│       │   ├── dashboard.tsx          # Main mission dashboard & subject switcher
│       │   ├── focus.$topicId.tsx     # Fullscreen focus session workspace
│       │   ├── onboarding.tsx         # Multi-step intake & syllabus parser
│       │   └── roadmap.tsx            # Visual subject roadmap viewer
├── public/
│   ├── favicon.svg                    # StudyVerse SVG emblem favicon
│   └── favicon.ico                    # StudyVerse fallback favicon
└── supabase/
    └── migrations/
        ├── 20260730180000_init_studyverse_os.sql      # Core DB schema
        ├── 20260731000000_multi_subject_syllabus.sql  # Multi-subject schema
        └── 20260731020000_rag_document_chunks.sql     # Vector RAG schema
```
