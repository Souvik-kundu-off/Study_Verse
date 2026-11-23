# StudyVerse_Project_Report_BWU 2.0 — Full Content

> **How to use this file.** This is the complete, paste-ready content for
> `StudyVerse_Project_Report_BWU 2.0.docx`. The *structure* mirrors
> `StudyVerse_Project_Report_BWU 1.0 .docx` exactly (title page, Bonafide
> Certificate, Abstract, TOC, List of Tables, List of Figures, Abbreviations,
> Chapters 1–5, References). Paste section by section into the 1.0 file so the
> original styles, images and page setup are preserved, then:
>
> * delete the old body text under each heading before pasting;
> * re-insert the two figures in §3.1 and §3.2 using the **existing** images
>   from the 1.0 file (`image2.png` architecture, `image3.png` ER diagram);
> * refresh the page numbers in the Table of Contents, List of Tables and List
>   of Figures after the document is paginated — the numbers below are the
>   intended layout, not measured ones.
>
> Every number in this report is either measured on the development machine,
> read from a source file, or taken from a live database query. Nothing is
> estimated silently.

---

## Title Page

**STUDYVERSE: AN AI-POWERED PERSONAL LEARNING OS & ADAPTIVE CURRICULUM ENGINEERING PLATFORM**

A PROJECT REPORT

*Submitted by*

**SOUVIK KUNDU** — BWU/BTA/23/063
**SOUMYADEEP GARAI** — BWU/BTA/23/071
**SUBHAM ROY** — BWU/BTA/23/083
**SAUMYADIP DEY** — BWU/BTA/23/116

*in partial fulfillment of the requirements for the award of the degree*

*of*

**BACHELOR OF TECHNOLOGY**

**IN**

**COMPUTER SCIENCE & ENGINEERING (AI & MACHINE LEARNING)**

*(Brainware University crest)*

**BRAINWARE UNIVERSITY**
*398, Ramkrishnapur Road, Barasat, North 24 Parganas, Kolkata – 700 125*

**NOVEMBER, 2026**

---

## Bonafide Certificate

**BRAINWARE UNIVERSITY**
*398, Ramkrishnapur Road, Barasat, North 24 Parganas, Kolkata – 700 125*

**Department of Computer Science and Engineering (AI & Machine Learning)**

### BONAFIDE CERTIFICATE

Certified that this project report titled **"STUDYVERSE: AN AI-POWERED PERSONAL LEARNING OS & ADAPTIVE CURRICULUM ENGINEERING PLATFORM"** is the bonafide work of **SOUVIK KUNDU (BWU/BTA/23/063)**, **SOUMYADEEP GARAI (BWU/BTA/23/071)**, **SUBHAM ROY (BWU/BTA/23/083)**, **SAUMYADIP DEY (BWU/BTA/23/116)** who carried out the project work under my supervision.

SIGNATURE

**Dr. Biswarup Mukherjee**
HEAD OF THE DEPARTMENT
SUPERVISOR

Department of Computer Science and Engineering (AI & Machine Learning)

**BRAINWARE UNIVERSITY**
*398, Ramkrishnapur Road, Barasat, North 24 Parganas, Kolkata – 700 125*

---

## ABSTRACT

StudyVerse is a full-stack, AI-assisted personal learning operating system for undergraduate engineering study. Version 1.0, the platform's first release, delivered adaptive curriculum engineering, a distraction-free focus workspace, educator course authoring, administrative telemetry, and a retrieval-augmented artificial intelligence (AI) tutor. Version 2.0 is a correctness release: it rebuilds the retrieval pipeline, the citation contract, and the review scheduling that the tutor depends on, and it removes two dashboard metrics that the stored data could not justify.

The defect in Version 1.0 was not missing features but missing integrity in the features it had. Chunk embeddings came from a character-histogram pseudo-embedding rather than from a trained model, so every stored vector was non-negative, every cosine similarity was positive, and the 0.2 retrieval threshold admitted almost any chunk. Citations carried no page number because the PDF reader discarded page boundaries during extraction. Flashcards had no review state, so the interface could display cards but could not schedule them. Two dashboard figures were computed from fields the schema never recorded.

Version 2.0 corrects each defect. The principal changes are:

1. **Real embedding model.** Chunks are embedded into 768-dimensional vectors by Gemini's `gemini-embedding-001`, with a verified fallback model and no silent substitution; ingestion fails rather than storing placeholder vectors.
2. **Page-aware extraction.** PDFs are parsed client-side with `pdfjs-dist` so that page boundaries survive chunking, and every chunk records the page it came from.
3. **Calibrated retrieval.** Measured relevant-pair similarity (0.7268–0.7780) separated cleanly from unrelated-pair similarity (0.4404–0.5700), so the shared threshold moved into the resulting gap, at 0.65. A floor of 0.6 now keeps the admin control out of the noise band.
4. **Honest citations.** The citation formatter prints a page number only when the chunk actually has one; a plain-text source never acquires an invented page.
5. **Spaced repetition.** A five-box Leitner scheduler with per-card ease now drives a review queue that presents only the cards that are due.

Every claim in this report is tied to a measured value, a source file, or a commit; where a measurement was not possible on the development machine, the report states that rather than estimating.

---

## TABLE OF CONTENTS

> Page numbers below are the intended layout. Refresh the field after pasting.

| Chapter | Title | Page No. |
|---|---|---|
| | ABSTRACT | iii |
| | LIST OF TABLES | vi |
| | LIST OF FIGURES | vii |
| | LIST OF ABBREVIATIONS & SYMBOLS | viii |
| 1. | INTRODUCTION | 1 |
| | 1.1 General Overview | 1 |
| | 1.2 Problem Statement & Motivation | 2 |
| | 1.3 Project Objectives | 3 |
| | 1.4 Scope of the Work | 4 |
| | 1.5 Summary of the Version 2.0 Upgrades | 5 |
| 2. | LITERATURE REVIEW & TECHNOLOGY SURVEY | 6 |
| | 2.1 Limitations of Existing Learning Management Systems (LMS) | 6 |
| | 2.2 Survey of Modern Web Frameworks & AI Architecture | 7 |
| | 2.3 Comparative Technology Matrix | 10 |
| 3. | SYSTEM ARCHITECTURE & METHODOLOGY | 11 |
| | 3.1 Overall System Architecture | 11 |
| | 3.2 Database Schema & Entity Relationships (ER) | 13 |
| | 3.3 Core Module Implementation Details | 16 |
| | 3.3.1 Authentication & Role-Based Access Control (RBAC) | 16 |
| | 3.3.2 Adaptive Curriculum & Roadmap Engine | 17 |
| | 3.3.3 Grounded RAG AI Tutor & Focus Mode Workspace | 19 |
| | 3.3.4 Verified Instructor Workspace & Course Management | 21 |
| | 3.3.5 Administrative Telemetry & RAG Vector Maintenance | 22 |
| | 3.3.6 Page-Aware PDF Extraction | 23 |
| | 3.3.7 The Real Embedding Pipeline | 24 |
| | 3.3.8 Retrieval Threshold Calibration | 26 |
| | 3.3.9 Honest Page-Level Citations | 28 |
| | 3.3.10 The Spaced-Repetition Review Loop | 29 |
| | 3.4 Data Hygiene & Referential Integrity (Cascade Deletes) | 31 |
| | 3.5 Design Decisions and Trade-offs | 32 |
| 4. | RESULTS, ANALYSIS & DISCUSSIONS | 34 |
| | 4.1 System Implementation Screenshots & Workflow Analysis | 34 |
| | 4.2 Telemetry Design and Measurement Integrity | 37 |
| | 4.3 Verification of the Version 2.0 Upgrades | 38 |
| | 4.4 Build & Static Analysis Metrics | 40 |
| 5. | CONCLUSION, FUTURE SCOPE & LIMITATIONS | 42 |
| | 5.1 Conclusion | 42 |
| | 5.2 Key Limitations | 43 |
| | 5.3 Future Scope | 44 |
| | REFERENCES | 45 |

---

## LIST OF TABLES

| Table No. | Title | Page No. |
|---|---|---|
| 2.1 | Comparative Feature Analysis: Traditional LMS vs. StudyVerse AI Learning OS | 10 |
| 3.1 | Core Technology Stack & Purpose | 12 |
| 3.2 | Database Tables & Schema Specifications | 14 |
| 3.3 | Embedding Model Candidates and Selection Criteria | 25 |
| 3.4 | Similarity Threshold Calibration Measurements | 27 |
| 3.5 | Leitner Box Intervals and Scheduling Behaviour | 30 |
| 4.1 | Verification Results for the Version 2.0 Upgrades | 39 |
| 4.2 | Build, Type-Check and Bundle Metrics | 41 |

---

## LIST OF FIGURES

| Figure No. | Title | Page No. |
|---|---|---|
| 3.1 | High-Level Multi-Tier System Architecture Diagram of StudyVerse | 11 |
| 3.2 | Entity-Relationship (ER) Diagram of StudyVerse Database Schema | 13 |
| 4.1 | Student Interactive Dashboard featuring Active Subject Tracks & Streak Heatmaps | 35 |
| 4.2 | Immersive Focus Workspace with AI Lesson Notes, Flashcards & Due-Review Queue | 36 |

---

## LIST OF ABBREVIATIONS & SYMBOLS

| Abbreviation | Expansion |
|---|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| BWU | Brainware University |
| CRUD | Create, Read, Update, Delete |
| DDL | Data Definition Language |
| ER | Entity Relationship |
| HNSW | Hierarchical Navigable Small World |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| LMS | Learning Management System |
| OCR | Optical Character Recognition |
| OS | Operating System |
| PDF | Portable Document Format |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| RLS | Row-Level Security |
| RPC | Remote Procedure Call |
| SDK | Software Development Kit |
| SQL | Structured Query Language |
| UI / UX | User Interface / User Experience |
| UUID | Universally Unique Identifier |

---

# CHAPTER 1: INTRODUCTION

## 1.1 GENERAL OVERVIEW

In the modern digital era, the landscape of higher education and self-directed technical learning is experiencing rapid transformation. Digital learning platforms, online video repositories, and Massive Open Online Courses (MOOCs) have increased access to information, but they have simultaneously introduced significant pedagogical hurdles. Students are frequently overwhelmed by unstructured study resources, standardised linear curricula that fail to adapt to individual learning speeds, and passive content consumption without active recall evaluation.

Simultaneously, the emergence of Large Language Models (LLMs) offers genuine potential for automated tutoring, personalised study planning, and instant concept explanation. Yet off-the-shelf conversational AI chatbots often suffer from two major flaws in academic environments:

* **Lack of Curriculum Structure:** General chatbots provide unstructured text responses without an overarching learning path, module tracking, or scheduled study pacing.
* **AI Hallucinations:** Standard LLM prompts lack grounding in verified course textbooks or official university syllabi, leading to misleading or mathematically inaccurate answers.

A third flaw is less often discussed but is the one this report is mostly concerned with: a chatbot that answers from a document collection must be able to show *which part* of *which document* it answered from. Without that, neither the student nor the examiner can tell a grounded answer from a plausible one.

To resolve these issues, StudyVerse has been developed as an AI-Powered Personal Learning Operating System (Learning OS). StudyVerse acts as an intelligent bridge connecting university professors, official curriculum standards, and students into an adaptive, self-paced study ecosystem.

## 1.2 PROBLEM STATEMENT & MOTIVATION

Traditional learning management tools (Canvas, Moodle, Google Classroom) function primarily as static content repositories. They operate under a rigid, one-size-fits-all model where all enrolled students receive identical assignment deadlines, static textbook reading lists, and no real-time adaptive feedback.

Key challenges identified in existing systems include:

* **Absence of Personalisation:** Standard LMS systems do not customise study schedules based on a student's daily available time (for example, 30 minutes per day versus 90 minutes per day) or on an initial knowledge baseline.
* **Disconnected AI Tools:** Students rely on external third-party AI chats, requiring constant context switching and copy-pasting of lecture material.
* **Unverified Academic Material:** Instructors have no built-in method within open AI systems to ensure that AI tutors answer questions strictly from official, peer-reviewed textbooks.
* **Fragmented User Management & Data Hygiene:** Changing roles in legacy platforms often requires complete database locks or server restarts, while deleting accounts frequently leaves behind orphaned data rows.
* **Unverifiable Grounding:** When a platform does retrieve from course material, it rarely reports where the retrieved passage came from, so a citation cannot be checked against the source PDF.

The motivation behind StudyVerse is to create a unified web platform that combines modern server-side reactive architecture with RAG-grounded AI tutors, giving students a structured Focus Mode study environment, giving teachers an authoring workspace to publish verified courses, and giving both a retrieval layer whose behaviour can be inspected and defended.

## 1.3 PROJECT OBJECTIVES

The primary objective of the StudyVerse project is to design, implement, and validate a production-ready AI Learning OS. The specific technical goals are:

1. **Architect a High-Performance Server-Driven Web Application:** Utilise TanStack Start, React 19, and Server-Side Rendering (SSR) deployed to Cloudflare Nitro workers to keep navigation responsive and avoid a client-side hydration penalty.
2. **Implement Adaptive AI Curriculum Generation:** Develop an AI curriculum synthesis engine using the Google Gemini API to parse subject titles and syllabi into sequential module and topic hierarchies.
3. **Build an RAG-Grounded Focus Workspace:** Construct a distraction-free student learning view equipped with dynamic lesson notes, active-recall quizzes, spaced-repetition flashcards, KaTeX formula rendering, and a grounded AI tutor backed by vector search (`pgvector`).
4. **Develop a Verified Educator Authoring System:** Provide professors with credential verification (institution name, academic title, teaching experience) and mandatory course textbook upload, enforcing creator-only update policies.
5. **Establish Enterprise Security, RBAC & Telemetry:** Design an Admin Console featuring non-refreshing dynamic role updates, cascade deletes (`ON DELETE CASCADE`) and vector chunk store maintenance.
6. **Guarantee Retrieval Integrity:** Embed document chunks with a real trained embedding model, calibrate the similarity threshold against measured data rather than intuition, and print a page number in a citation only when a page number exists.

## 1.4 SCOPE OF THE WORK

The scope of this project encompasses full-stack software development, database modelling, AI prompt engineering, retrieval engineering, and cloud deployment:

* **Frontend Development:** Responsive visual interface with dark/light themes, custom CSS glassmorphism, Recharts visualisation, and the Lucide design system.
* **Backend Server Functions:** Server-side RPC methods executing authentication middleware, Supabase PostgREST queries, and Gemini API calls.
* **Database Architecture:** A PostgreSQL schema containing relational tables for profiles, goals, roadmap modules, roadmap topics, courses, enrolments, documents, document chunks, notes, quizzes, quizzes attempts, flashcards, and system settings, equipped with row-level security (RLS) policies.
* **Target Audience:** Undergraduate and postgraduate students, university professors and instructors, and institutional system administrators.

## 1.5 SUMMARY OF THE VERSION 2.0 UPGRADES

Version 1.0 of StudyVerse was a complete, working platform, and this report does not replace that account — it extends it. The work described here is a set of five targeted upgrades to the retrieval and review layers, delivered as two database migrations (`20261117000000_real_embeddings_and_review_state.sql` and `20261117000100_calibrate_match_threshold.sql`) and a series of application changes. They are:

1. **A real embedding model replaces the pseudo-embedding.** Chunk text is now embedded by `gemini-embedding-001` at 768 dimensions, with `text-embedding-004` as a declared fallback. The previous implementation produced a character histogram, which had the unfortunate property of occupying only the non-negative orthant of the vector space; as a result every cosine similarity it produced was non-negative, so no threshold could separate relevant from irrelevant material.
2. **Page boundaries survive PDF extraction.** The browser-side extractor now returns one string per PDF page, chunking is performed page by page, and each chunk row stores its `page_number`.
3. **The retrieval threshold is calibrated against measurement.** With real vectors, the similarity distribution for relevant pairs and for unrelated pairs was measured separately, and the shared threshold was moved from 0.2 to 0.65 — inside the measured gap between the two distributions. The tuning control is now bounded to 0.6–0.9, so the noise band below the floor is no longer reachable from the console.
4. **Citations became checkable.** The formatter emits `[Source: <document>, Page <n>]: <content>`, and omits the page clause entirely when the chunk has no page, rather than substituting a default.
5. **Flashcards became schedulable.** A five-box Leitner scheduler with a per-card ease factor now maintains `box`, `next_review_at`, `review_count`, `lapses`, `ease` and `last_reviewed_at`, and a `/review` route presents only cards that are due.

One further change is subtractive rather than additive. Version 1.0's administrator console displayed a quiz-accuracy percentage and an AI-helpfulness index. Neither figure could be computed from the schema: there was no helpfulness signal recorded at all, and the accuracy figure was not derived from `quiz_attempts`. Both were removed in commit `3773be2` rather than re-specified, because a number that cannot be recomputed from stored data is not telemetry — it is decoration. Section 4.2 describes what replaced them.

---

# CHAPTER 2: LITERATURE REVIEW & TECHNOLOGY SURVEY

## 2.1 LIMITATIONS OF EXISTING LEARNING MANAGEMENT SYSTEMS (LMS)

A critical examination of current educational platforms highlights several functional gaps:

* **Canvas / Moodle:** Excellent for file storage and grade submission, but they lack native AI-assisted learning paths or real-time tutoring.
* **Coursera / Udemy:** Provide structured video courses, but offer no customisation against the student's daily study hours and no interactive RAG-grounded tutor over uploaded user notes.
* **Standard AI Chatbots (ChatGPT, Claude, Gemini Web UI):** Capable of generating text, but they lack persistent progress tracking, module completion states, active recall quizzes, and institutional verification badges.

A fourth gap is specific to retrieval-augmented systems, and it is the gap that most directly motivates Version 2.0. A RAG system is only as trustworthy as its weakest link, and that link is usually not the language model — it is the embedding. If the embedding is semantically meaningless, then no amount of prompt engineering will make the retrieval correct, and no threshold will separate signal from noise. An LMS that quotes a textbook paragraph at a student is offering a citation; a citation whose page number is invented is worse than no citation at all.

## 2.2 SURVEY OF MODERN WEB FRAMEWORKS & AI ARCHITECTURE

To achieve high responsiveness, developer velocity, and scalable AI integration, a thorough technology evaluation was conducted.

**1. TanStack Start & React 19**

TanStack Start is a modern full-stack React framework built on top of TanStack Router and Vite. Unlike a traditional single-page application, route loaders and server functions execute on the server during the initial request, and the router supports typed, file-based routes. React 19's concurrent rendering and the `useTransition` model allow the interface to remain interactive while server data is in flight. For StudyVerse this matters because the dashboard, roadmap and focus views are all data-heavy and are entered from a cold navigation; server rendering removes the blank-canvas interval that a client-only SPA would show.

**2. Supabase & PostgreSQL `pgvector`**

Supabase supplies managed PostgreSQL with Row-Level Security, authentication, and object storage in one project. The `pgvector` extension adds a `vector(n)` column type together with distance operators (`<->` for L2, `<#>` for negative inner product, `<=>` for cosine distance) and index types. Because chunk vectors live in the same database as the ownership rows, an RLS policy can scope a similarity query to the calling user without an additional authorisation hop. StudyVerse uses a `vector(768)` column and cosine distance throughout.

**3. Google Gemini API**

The Gemini API exposes both generative and embedding endpoints. The embedding endpoint accepts a batch of content objects and an `outputDimensionality` parameter, which allows a 768-dimensional projection of a larger model. Two properties make it suitable here: the projection is performed by the model rather than by a post-hoc truncation, and the API is reachable from the Nitro server runtime with a single API key, so no additional infrastructure is required. The generative endpoint is used for curriculum synthesis, lesson notes and tutoring, and the model identifier is stored in `system_settings` so that it can be changed without a redeploy.

**4. Real Embedding Models**

An embedding model maps text to a vector such that semantically similar text lands close together under cosine similarity. Sentence-BERT established that a siamese network over a pretrained transformer, fine-tuned on natural-language-inference and semantic-textual-similarity data, produces sentence embeddings that are both fast and competitive on similarity benchmarks. Modern hosted embedding models extend the same idea at larger scale. The operative difference from a hand-built feature vector is that a trained model places unrelated sentences in *different directions*, so their cosine similarity is near zero and frequently negative. This is precisely the property that a threshold requires.

**5. Vector Indexing in PostgreSQL**

Exact nearest-neighbour search over a `vector` column is a sequential scan. HNSW (Hierarchical Navigable Small World) builds a multi-layer proximity graph in which each node keeps a bounded set of neighbours; a query descends greedily from the top layer and refines at the bottom, giving approximate results in logarithmic time with high recall. `pgvector` implements HNSW with an operator class that must match the distance function used at query time — `vector_cosine_ops` for cosine distance. StudyVerse's `document_chunks_embedding_idx` uses exactly that operator class, so the index is eligible for the `<=>` predicate in `match_document_chunks`.

**6. Spaced Repetition Scheduling**

Leitner's box system, described in 1972, is the simplest scheduling algorithm that still works: each item sits in a box, a correct recall promotes it to the next box, an incorrect recall returns it to the first, and each box has a longer review interval than the one below. SuperMemo's later work replaced fixed box intervals with a per-item ease factor that adapts to the individual item's difficulty. StudyVerse combines the two: five Leitner boxes supply the interval ladder, and a per-card ease multiplier adjusts the ladder per card, bounded so that a card cannot become unreviewable.

## 2.3 COMPARATIVE TECHNOLOGY MATRIX

Table 2.1 compares the capability set of a traditional LMS, a general-purpose AI chatbot, and StudyVerse. The matrix is deliberately about *capabilities that can be verified*, not about marketing claims; a cell marked with a tick means the capability is implemented and reachable in the shipped interface.

**Table 2.1 — Comparative Feature Analysis: Traditional LMS vs. StudyVerse AI Learning OS**

| Capability | Traditional LMS | General AI Chatbot | StudyVerse |
|---|---|---|---|
| Structured curriculum with ordered modules and topics | ✅ | ❌ | ✅ |
| Pacing derived from the student's daily time budget | ❌ | ❌ | ✅ |
| Answers grounded in the course's own PDFs | ❌ | ⚠️ | ✅ |
| Page-level source citations that can be checked | ❌ | ❌ | ✅ |
| Embeddings from a trained model | n/a | ⚠️ | ✅ |
| Scheduled spaced repetition over generated cards | ❌ | ❌ | ✅ |
| Active-recall quizzes with scored attempts | ✅ | ⚠️ | ✅ |
| Instructor credential verification | ✅ | ❌ | ✅ |
| Role-based access control enforced server-side | ✅ | ❌ | ✅ |
| Cascade-safe account deletion | ⚠️ | n/a | ✅ |
| Telemetry recomputable from stored rows | ⚠️ | ❌ | ✅ |

---

# CHAPTER 3: SYSTEM ARCHITECTURE & METHODOLOGY

## 3.1 OVERALL SYSTEM ARCHITECTURE

StudyVerse is a four-tier application. The client tier is a React 19 application routed by TanStack Router and built by Vite; it renders the dashboard, roadmap, course catalogue, focus workspace, review session, educator hub and admin console. The server tier consists of TanStack Start server functions running on the Cloudflare Nitro runtime; every privileged operation — curriculum generation, embedding, retrieval, role checks — executes here, never in the browser. The data tier is Supabase: PostgreSQL for relational and vector data, Storage for uploaded PDFs, and Auth for identity. The external tier is the Gemini API, used for both embedding and generation.

Figure 3.1 shows the arrangement. Two properties of the diagram are worth stating explicitly because they constrain the design. First, the browser never holds the Gemini API key; the key is read on the server and a missing key is a hard error, not a degraded mode. Second, PDF text extraction happens in the browser, not on the server, because the Nitro worker has no filesystem and a 300-page textbook would exceed a worker's request budget; the extracted page text is sent to a server function for chunking and embedding.

*(Insert Figure 3.1 — the existing architecture diagram, `image2.png`, from the 1.0 file.)*

**Table 3.1 — Core Technology Stack & Purpose**

| Layer | Technology | Purpose |
|---|---|---|
| UI framework | React 19 + TanStack Router / Start | File-based routing, server functions, SSR |
| Styling | Tailwind CSS + custom glassmorphism | Responsive dark and light interface |
| Charts | Recharts | Study-minutes, streak and progress visualisation |
| Server runtime | Cloudflare Nitro (via TanStack Start) | Edge request handling for server functions |
| Relational store | Supabase PostgreSQL | Application tables, RLS policies |
| Vector store | `pgvector` with an HNSW index | 768-dimensional chunk similarity search |
| Authentication | Supabase Auth (Google OAuth) | Session issuance and identity |
| Object storage | Supabase Storage | Textbook and syllabus PDFs |
| Generation | Gemini API, model held in `system_settings` | Curriculum synthesis, notes, tutoring |
| Embeddings | `gemini-embedding-001` at 768 dimensions | Chunk vectorisation at ingest and query time |
| PDF parsing | `pdfjs-dist`, lazily imported | Page-aware text extraction in the browser |
| Client data | TanStack Query | Cache, invalidation and optimistic updates |

## 3.2 DATABASE SCHEMA & ENTITY RELATIONSHIPS (ER)

The schema is relational and deliberately normalised. Eighteen public tables are in use; Table 3.2 lists the thirteen that carry the platform's core entities and the five that exist to support auditing, missions, sessions and configuration are described in the paragraphs that follow.

The central chain is `profiles → goals → roadmap_modules → roadmap_topics`. A profile is created when a user first authenticates and carries the `role` column that RBAC reads. A goal records the degree the student is working towards together with a daily minute budget and a target proficiency level; the curriculum engine consumes that budget when it decides how finely to decompose a module. Modules group topics, and topics carry the completion state that the roadmap and dashboard both read.

The course chain is separate and crosses the roadmap chain only through enrolments: an instructor owns `courses`, a student creates an `enrollments` row, and `documents` attach to a course. `document_chunks` is the retrieval table; each row is one page-local passage, carries a `vector(768)` embedding, an `embedding_model` label, an `embedded_at` timestamp, and a nullable `page_number`. The nullability is load-bearing and is discussed in §3.3.9.

Study artefacts hang off topics: `notes`, `quizzes` with their `quiz_questions`, `quiz_attempts` for scored telemetry, and `flashcards` with the review state introduced in Version 2.0. `system_settings` is a key–value table holding `match_threshold`, `match_count`, `ai_model` and `maintenance_mode`. `admin_audit_log` records privileged actions, `ai_tutor_logs` records tutor turns, and `daily_missions` and `study_sessions` supply the streaks and minute totals shown on the dashboard.

*(Insert Figure 3.2 — the existing ER diagram, `image3.png`, from the 1.0 file.)*

**Table 3.2 — Database Tables & Schema Specifications**

| Table | Key columns | Relationship | Purpose |
|---|---|---|---|
| `profiles` | `id` (uuid), `role` | → `auth.users` | Identity, role, display name |
| `goals` | `id`, `user_id`, `daily_minutes` | → `profiles` | Target degree and study budget |
| `roadmap_modules` | `id`, `goal_id`, `position` | → `goals` | Ordered module sequence |
| `roadmap_topics` | `id`, `module_id`, `status` | → `roadmap_modules` | Ordered topics with completion state |
| `courses` | `id`, `instructor_id`, `verified` | → `profiles` | Verified course catalogue |
| `enrollments` | `id`, `course_id`, `user_id` | → `courses`, `profiles` | Student–course membership |
| `documents` | `id`, `course_id`, `storage_path` | → `courses` | Uploaded textbook or syllabus |
| `document_chunks` | `id`, `document_id`, `page_number`, `embedding vector(768)` | → `documents` | Retrievable page-local passages |
| `notes` | `id`, `user_id`, `topic_id` | → `roadmap_topics` | Lesson notes and annotations |
| `quizzes` / `quiz_questions` | `id`, `topic_id` | → `roadmap_topics` | Active-recall item banks |
| `quiz_attempts` | `id`, `user_id`, `quiz_id`, `score` | → `quizzes` | Scored attempts; telemetry source |
| `flashcards` | `id`, `user_id`, `box`, `ease`, `next_review_at` | → `roadmap_topics` | Spaced-repetition state |
| `system_settings` | `key` (pk), `value` | — | Threshold, count, model, maintenance |

## 3.3 CORE MODULE IMPLEMENTATION DETAILS

The following sub-sections describe each module as it exists in the repository. Code excerpts are abridged: error handling, logging and progress callbacks are omitted where they do not change the behaviour being described.

### 3.3.1 Authentication & Role-Based Access Control (RBAC)

Authentication is handled by Supabase Auth with Google OAuth. Client routes are protected by TanStack Router context checks in `src/routes/_authenticated/route.tsx`; a session that is absent or expired redirects before the protected component mounts.

Role-Based Access Control is enforced twice: the router decides which routes are reachable, and every privileged server function re-checks the caller's role in the database. The second check is the authoritative one, because a server function is an HTTP endpoint and can be called without the client having rendered the route at all.

* **Student:** access to the Dashboard (`/dashboard`), Roadmap (`/roadmap`), Focus Mode (`/focus/$topicId`), Course Catalogue (`/courses`) and the review queue (`/review`).
* **Instructor:** access to the Teacher Authoring Hub (`/teacher`) and the course catalogue; restricted from student study routes.
* **Admin:** exclusive access to the Admin Console (`/admin`) for platform telemetry, role promotion and vector store maintenance.

```ts
// src/lib/admin.functions.ts — abridged
async function requireAdminRole(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Forbidden: administrator role required");
  }

  return profile;
}
```

Because the role is read from the database on every privileged call rather than from a token claim, a demotion takes effect on the next request without a re-issue of the session. This is the property that the earlier design described as "non-refreshing role state management".

### 3.3.2 Adaptive Curriculum & Roadmap Engine

The curriculum engine converts a course title, a syllabus, and a student's daily minute budget into a module/topic tree. It runs as a single server function that calls the Gemini generative endpoint with a system instruction and a structured response requirement, validates the result against a schema, and writes the tree inside a transaction so that a partial curriculum cannot be committed.

The system instruction is the part of the engine that encodes the pedagogical rules. It is deliberately explicit about the budget, because a model that is not told the budget will produce topics that no student can complete in an evening.

```ts
// Abridged system instruction used by the curriculum server function
const systemInstruction = `
You are a curriculum engineer. Decompose the supplied course into
sequential modules, each containing ordered topics.

Rules:
  1. Follow the syllabus order. Do not invent units that are not in it.
  2. Every topic must be completable within the student's daily budget
     of ${dailyMinutes} minutes.
  3. Each topic must name exactly one assessable outcome.
  4. Difficulty must be one of: foundation, intermediate, advanced.
  5. Return JSON only, matching the supplied response schema.
`;
```

Two failure modes are handled explicitly. If the model returns a tree that fails schema validation, the server function retries once with the validation error appended to the prompt, and then fails the request rather than writing a partially valid tree. If the model returns a tree whose total estimated time exceeds the budget by more than a factor of two, the tree is rejected as mis-scaled. Both checks exist because the roadmap is the spine of every other student-facing view: a malformed roadmap does not degrade one screen, it degrades all of them.

The generated tree is stored as `roadmap_modules` rows with a `position` column and `roadmap_topics` rows with their own `position`, so ordering is data rather than an implicit array index. The roadmap view reads both tables in one query and renders the completion state from each topic's `status`.

### 3.3.3 Grounded RAG AI Tutor & Focus Mode Workspace

The Focus Mode workspace at `/focus/$topicId` is the student's working environment. It assembles four panels: the AI-generated lesson notes for the topic, a formula-rendering surface using KaTeX, the flashcard and quiz surface, and the AI tutor panel.

The tutor is retrieval-augmented. Each question is embedded with the same model that embedded the corpus, the resulting vector is used to call `match_document_chunks`, and the returned passages are inserted into the tutor prompt as numbered context blocks with their citations. The model is instructed to answer only from those blocks and to say so when they do not contain an answer.

The embedding step is the part that Version 2.0 changed, and it is worth stating the comparison explicitly. For two vectors **A** and **B**, cosine similarity is computed as:

> *Similarity Score = cos(θ) = (A · B) / (‖A‖ ‖B‖)*

A trained embedding model produces vectors in which unrelated passages have a similarity close to zero and frequently below it. The Version 1.0 pseudo-embedding produced only non-negative components, which forced every similarity into the interval [0, 1] and compressed the useful range; that is why a threshold of 0.2 was defensible against that model and indefensible against a real one. Section 3.3.8 describes how the replacement threshold was chosen.

The lesson-notes panel is generated on first visit for a topic and cached in the notes table, so a second visit does not spend a generation call. Formula rendering uses KaTeX on the client, which means a formula that fails to parse renders as its source rather than as a broken glyph.

### 3.3.4 Verified Instructor Workspace & Course Management

The educator hub at `/teacher` is gated by the instructor role and by an explicit verification record. An instructor profile carries institution, academic title and years of experience; the course editor refuses to publish a course whose instructor profile is not verified.

Course authoring requires a syllabus and at least one textbook PDF. This is not a formality: the retrieval corpus for a course is exactly those documents, so a course without documents has a tutor with nothing to ground on. The upload flow stores the file in Supabase Storage, records a `documents` row, and then enqueues extraction and embedding for that document.

Edit rights are creator-only. An instructor may edit a course they created and may not edit another instructor's course, even if both are in the same institution. Students may read a published course and enrol in it; they may not modify any part of it.

### 3.3.5 Administrative Telemetry & RAG Vector Maintenance

The admin console at `/admin` aggregates platform state: user counts by role, course and document counts, embedding coverage for the chunk store, and the current values of the tuning keys in `system_settings`. Role promotion is performed from the console and takes effect on the next request because roles are read from the database, as described in §3.3.1.

The maintenance panel exposes the two retrieval tuning values (`match_threshold`, bounded to 0.6–0.9, and `match_count`), the chat model identifier, and a maintenance-mode flag. It also reports embedding coverage — the proportion of `document_chunks` rows whose `embedding` is not null — because that single number predicts whether retrieval will behave correctly far better than any other metric on the page.

Version 1.0 also displayed a quiz-accuracy percentage and an AI-helpfulness index on this page. Both were removed in commit `3773be2`. The helpfulness index had no backing signal of any kind, and the accuracy figure was not computed from `quiz_attempts`; presenting either would have meant presenting a number that no query in the repository could reproduce. What replaced them is described in §4.2.

### 3.3.6 Page-Aware PDF Extraction

Version 1.0 extracted PDF text as a single string, which is why its citations could not name a page: by the time the text reached the chunker, the page boundaries had already been discarded. Version 2.0 extracts one string per page.

Extraction runs in the browser, using `pdfjs-dist` loaded through a lazy dynamic import with its worker resolved as a Vite asset URL. Two limits bound the work: `MAX_PDF_PAGES = 300` caps the number of pages read from a single file, and `MAX_CHUNKS_PER_DOCUMENT = 100` caps the number of chunks persisted per document. A file that exceeds the page cap is truncated with a reported warning rather than silently.

```ts
// src/lib/file-extract.ts — abridged
export async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  const limit = Math.min(pdf.numPages, MAX_PDF_PAGES);

  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages;
}
```

Chunking then proceeds page by page with `chunkText(text, 600, 80, 100)` — a 600-character target with an 80-character overlap and a 100-character minimum — and each resulting chunk is written with the page index from which it came. Plain-text uploads have no page structure, so their chunks are written with `page_number` set to null. That null is intentional and is handled by the citation formatter rather than by a default.

### 3.3.7 The Real Embedding Pipeline

`src/lib/embeddings.server.ts` is the only module that talks to the embedding endpoint. It defines `EMBEDDING_DIMENSIONS = 768`, a candidate model list beginning with `gemini-embedding-001` and falling back to `text-embedding-004`, a batch size, a bounded attempt count per model, and an exponential back-off base delay.

The request is a batch call: many content objects, one HTTP round trip, and an `outputDimensionality` on every request so that the returned vectors are 768 wide regardless of the model's native width.

```ts
// src/lib/embeddings.server.ts — abridged
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: batch.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    }),
  },
);

const payload = await response.json();
const vectors = payload.embeddings.map(
  (entry: { values: number[] }) => entry.values,
);
```

Three rules govern failure. First, a missing API key throws; there is no local fallback embedding. Second, a failed batch is retried within the attempt budget and then throws; it is never replaced by a zero vector or a hash. Third, `readVectors` validates every returned vector for length and finiteness before the row is written, so a malformed response becomes an error at the boundary rather than a silently corrupt row.

Removing the fallback was a deliberate trade. A fallback that produces meaningless vectors does not make the system more available; it makes it fail in a way that looks like success, because the ingest completes, the dashboard shows coverage, and the tutor retrieves noise. Failing loudly at ingest is the cheaper failure.

**Table 3.3 — Embedding Model Candidates and Selection Criteria**

| Candidate | Dimensions | Access path | Selection outcome |
|---|---|---|---|
| `gemini-embedding-001` | 768 (projected) | Gemini API, `outputDimensionality` | Selected as primary |
| `text-embedding-004` | 768 | Gemini API | Selected as declared fallback |
| `text-embedding-3-small` | 1536 | OpenAI API | Rejected: second vendor, no existing credential |
| `all-MiniLM-L6-v2` | 384 | Local ONNX runtime | Rejected: no model runtime in the Nitro worker |
| Character-histogram pseudo-embedding | n/a | In-process (Version 1.0) | Removed: non-negative, degenerate geometry |

### 3.3.8 Retrieval Threshold Calibration

`match_document_chunks` is a SQL function taking `query_embedding`, `match_threshold`, `match_count`, `p_user_id` and `p_topic_id`. It filters on `embedding IS NOT NULL`, applies the caller's RLS scope, orders by cosine distance, and returns at most `match_count` rows above `match_threshold`.

```ts
// src/lib/rag.server.ts — abridged
const { data, error } = await supabase.rpc("match_document_chunks", {
  query_embedding: embedding,
  match_threshold: DEFAULT_MATCH_THRESHOLD,
  match_count: DEFAULT_MATCH_COUNT,
  p_user_id: userId,
  p_topic_id: topicId ?? null,
});

if (error) {
  console.warn("[RAG] retrieval failed:", error.message);
  return "";
}
```

The tuning constants live in one module, `src/lib/rag-tuning.ts`, as `DEFAULT_MATCH_THRESHOLD = 0.65`, `DEFAULT_MATCH_COUNT = 4`, and the bounds `MIN_MATCH_THRESHOLD = 0.6` / `MAX_MATCH_THRESHOLD = 0.9`. They are read at call time rather than captured in the SQL function, so the admin console can change the behaviour of the next request without a migration. The two bounds are enforced wherever the value is written or read, so the calibrated default cannot be undone from the console by a value the calibration rejects.

The value 0.65 was not chosen by intuition. With the real embedding model in place, two sets of pairs were measured: pairs known to be topically relevant, and pairs deliberately drawn from unrelated topics. Relevant pairs scored between 0.7268 and 0.7780. Unrelated pairs scored between 0.4404 and 0.5700. The two ranges do not overlap, and the gap between the highest unrelated score and the lowest relevant score is 0.1568. A threshold placed inside that gap is correct for both populations; 0.65 sits 0.08 above the noise ceiling and 0.0768 below the signal floor.

**Table 3.4 — Similarity Threshold Calibration Measurements**

| Measurement | Observed value | Interpretation |
|---|---|---|
| Relevant pair, lowest score | 0.7268 | Signal floor |
| Relevant pair, highest score | 0.7780 | Signal ceiling |
| Unrelated pair, lowest score | 0.4404 | Noise floor |
| Unrelated pair, highest score | 0.5700 | Noise ceiling |
| Separation gap | 0.1568 | Empty interval between the two populations |
| Selected threshold | 0.65 | Inside the gap; 0.08 above noise, 0.0768 below signal |

The same numbers were later confirmed end to end on live data: a query against the corpus scored 0.7486 against its own topic and 0.5645 against an unrelated topic, and retrieval at 0.65 returned exactly one chunk — the correct one — at similarity 0.7459 with `page: 12`.

### 3.3.9 Honest Page-Level Citations

The citation contract is a single function. It renders a document name, an optional page locator, and the passage text. The important line is the conditional: the page clause is emitted only when the stored page is a finite number.

```ts
// src/lib/rag.server.ts — abridged
export function formatCitation(chunk: {
  document_name: string;
  page_number: number | null;
  content: string;
}): string {
  const page = chunk.page_number;
  const locator =
    typeof page === "number" && Number.isFinite(page)
      ? `, Page ${page}`
      : "";

  return `[Source: ${chunk.document_name}${locator}]: ${chunk.content}`;
}
```

This produces `[Source: Operating Systems – Tanenbaum, Page 214]: …` for a PDF chunk and `[Source: Lecture Notes – Week 4]: …` for a plain-text chunk. It does not produce `Page 0`, `Page null` or `Page 1`. It also does not project a page number for a legacy chunk that was ingested before page tracking existed: those rows were re-embedded in place, but their page identity was never recorded and cannot be recovered, so they correctly cite without a page.

The distinction matters more than it may appear. A citation is a claim that a specific document says a specific thing at a specific place. If the page is invented, the claim is false even when the passage is genuine, and a marker checking the reference will find nothing there. Omitting the locator leaves the claim weaker but true.

### 3.3.10 The Spaced-Repetition Review Loop

Version 1.0 could create flashcards but could not schedule them: there was no review state, so every card was equally due and the interface had no way to build a queue. Version 2.0 adds the state and the scheduler.

The migration adds six columns to `flashcards`: `box` (1–5), `next_review_at`, `review_count`, `lapses`, `ease` as `NUMERIC(4,2)` defaulting to 2.5, and `last_reviewed_at`. Three check constraints bound them — `flashcards_ease_range`, `flashcards_box_range` and `flashcards_counts_non_negative` — and the index `flashcards_user_next_review_idx` makes the due-query a range scan.

Intervals follow a Leitner ladder in minutes: `BOX_INTERVALS_MINUTES = [10, 1440, 4320, 10080, 30240]`, that is ten minutes, one day, three days, seven days and twenty-one days.

**Table 3.5 — Leitner Box Intervals and Scheduling Behaviour**

| Box | Interval (minutes) | Human equivalent | Promotion | Typical use |
|---|---|---|---|---|
| 1 | 10 | 10 minutes | New card, or any `again` | Same-session re-check |
| 2 | 1,440 | 1 day | From box 1 on `good` | Next-day consolidation |
| 3 | 4,320 | 3 days | From box 2 on `good` | Short-term retention |
| 4 | 10,080 | 7 days | From box 3 on `good` | Weekly recall |
| 5 | 30,240 | 21 days | From box 4 on `good` or `easy` | Long-term maintenance |

The transition function takes a grade in the set {`again`, `hard`, `good`, `easy`} and returns the next box, the next interval and the next due timestamp.

```ts
// src/lib/review.functions.ts — abridged
export function nextSchedule(card: Flashcard, grade: Grade) {
  const now = Date.now();
  let { box, ease, lapses } = card;
  ease = round2(ease ?? DEFAULT_EASE);

  if (grade === "again") {
    box = 1;
    lapses += 1;
    ease = clampEase(ease - 0.2);
  } else if (grade === "hard") {
    ease = clampEase(ease - 0.05);       // stay in the current box
  } else if (grade === "good") {
    box = Math.min(box + 1, 5);
  } else {
    box = Math.min(box + 2, 5);
    ease = clampEase(ease + 0.15);
  }

  const interval = BOX_INTERVALS_MINUTES[box - 1];
  const scaled = grade === "hard" ? interval : Math.round(interval * ease);
  const delayMs = Math.max(scaled, 10) * MINUTE;

  return {
    box,
    ease: round2(ease),
    lapses,
    next_review_at: new Date(now + delayMs).toISOString(),
  };
}
```

Three details are deliberate. `hard` does not multiply the interval by the ease factor; a card graded hard has been recalled, so it should not be pushed further out than the box interval, but it should not compound either. `again` resets to box 1 and increments `lapses`, which is the only counter that measures genuine forgetting. And the ease factor is clamped to [1.3, 5.0], which prevents a long run of `easy` grades from producing an interval long enough that the card is effectively retired, and a long run of `again` grades from producing one so short that the queue never drains.

The `/review` route reads the due queue with a limit, presents one card at a time with four grade buttons, and writes the new schedule on each grade. A live click-through of the flow started at 0 of 5, revealed the answer, graded the card `good`, and left the queue at 1 of 5, with `review_count` incremented from 0 to 1 and the due count for the topic falling from 25 to 24.

## 3.4 DATA HYGIENE & REFERENTIAL INTEGRITY (CASCADE DELETES)

Deleting an account in a relational application is a referential-integrity problem before it is a privacy problem: every table that references the departing row must either lose its rows or point at nothing. StudyVerse resolves this with `ON DELETE CASCADE` on every foreign key that descends from `profiles` or `auth.users`, applied in a migration that is idempotent so that it can be re-run against an environment where some constraints already exist.

```sql
-- supabase/migrations/20260803010000_cascade_user_deletes.sql — abridged
-- The same block is repeated for every table that owns a user_id column.
DO $$
BEGIN
  ALTER TABLE roadmap_modules
    DROP CONSTRAINT IF EXISTS roadmap_modules_user_id_fkey;
  ALTER TABLE roadmap_modules
    ADD CONSTRAINT roadmap_modules_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;
```

Writing the constraint change inside a `DO` block with `DROP … IF EXISTS` makes the migration re-runnable; a plain `ADD CONSTRAINT` would fail on the second application and leave the migration half-applied. The consequence of the cascade is that removing one `profiles` row removes the goal, the modules, the topics, the notes, the quizzes, the attempts, the flashcards, the enrolments and the document chunks that belong to that student, in one statement, with no orphan rows left behind.

The vector store participates in the same rule. A deleted document takes its chunks with it, so a stale embedding cannot be retrieved after its source has gone, which is the failure mode that makes retrieval-augmented systems quote documents the user believes they have deleted.

## 3.5 DESIGN DECISIONS AND TRADE-OFFS

Six decisions shaped Version 2.0 and each cost something:

1. **Fail loudly rather than degrade quietly.** Ingestion throws when the embedding provider is unavailable instead of writing placeholder vectors. The trade is availability: an outage now stops ingest instead of producing a corpus that looks complete and retrieves nonsense.
2. **Extract PDFs in the browser.** This keeps large documents off the worker's request budget and gives access to a mature parser. The trade is that a very large PDF is slow on the student's machine, and the page cap of 300 must be enforced visibly.
3. **Keep page numbers nullable rather than defaulting them.** Legacy and plain-text chunks cite without a locator. The trade is a less precise citation in exchange for a true one.
4. **One global threshold rather than a per-topic threshold.** A single calibrated value is simple to reason about and simple to audit. The trade is that a topic with unusually homogeneous source material may benefit from a different value, which the current design does not express.
5. **Combine Leitner boxes with an ease factor.** The box ladder gives predictable intervals and the ease factor adapts to individual cards. The trade is that `hard` behaves unusually — it neither promotes nor lengthens — which is correct but needs the comment in the code to remain correct.
6. **Remove metrics that cannot be recomputed.** The admin console lost two numbers. The trade is a page that looks emptier in exchange for a page on which every number can be traced to a query.

---

# CHAPTER 4: RESULTS, ANALYSIS & DISCUSSIONS

## 4.1 SYSTEM IMPLEMENTATION SCREENSHOTS & WORKFLOW ANALYSIS

The completed StudyVerse application was evaluated across several user workflows. The interface retains Version 1.0's visual language — glassmorphic surfaces, a dark default theme, and a persistent left navigation — and Version 2.0 adds the review queue as a first-class destination.

1. **Student Dashboard & Active Parallel Tracks.** The dashboard at `/dashboard` shows the student's active subject tracks, current daily streak, weekly study-minutes chart and activity heatmap. Each track exposes its next topic and a direct entry into Focus Mode.
2. **Focus Workspace with Grounded Tutor.** The focus view at `/focus/$topicId` combines lesson notes, the formula surface, the flashcard and quiz surface, and the tutor. Tutor answers carry the citation strings produced by `formatCitation`, so a student can see the document and page a passage came from.
3. **Verified Instructor Authoring Hub.** The hub at `/teacher` lists the instructor's courses, their verification state, and the documents attached to each course. Publishing is blocked until the verification record and at least one document are present.
4. **Administrative Console.** The console at `/admin` reports role counts, course and document counts, embedding coverage over the chunk store, and the live values of the retrieval tuning keys. It no longer reports a quiz-accuracy percentage or a helpfulness index.
5. **Due-Review Queue.** The queue at `/review` presents the cards whose `next_review_at` has passed, one at a time, with four grades. It is the only student surface introduced by Version 2.0 and it is the one that turns a static deck into a schedule.

Figure 4.1 shows the dashboard layout and Figure 4.2 shows a review session in progress.

*(Insert Figure 4.1 — see the ASCII rendering below.)*

**Figure 4.1 — Student Interactive Dashboard featuring Active Subject Tracks & Streak Heatmaps**

```
+-----------------------------------------------------------------------------+
|  StudyVerse    [ Dashboard ]   [ Roadmap ]   [ Courses ]      ( S. Kundu )   |
+-----------------------------------------------------------------------------+
|                                                                             |
|  TODAY'S MISSION                                                            |
|  Active track : Data Structures & Algorithms                                |
|  Current topic: Binary Search Trees & Balancing                            |
|  [ Continue Learning -> ]        [ Ask the AI Tutor ]                       |
|                                                                             |
|  PROGRESS             WEEKLY STUDY MINUTES           STREAK                 |
|  Modules    4 / 9     Mon  ######                                    12 d   |
|  Topics    17 / 41    Tue  ####        Wed  ##                              |
|  Minutes  312 / 540   Thu  #####       Fri  #####                           |
|                       Sat  #           Sun  -                               |
|                                                                             |
|  REVIEW QUEUE     5 cards due today   ->   [ Start review ]                 |
|                                                                             |
+-----------------------------------------------------------------------------+
```

*(Insert Figure 4.2 — see the ASCII rendering below.)*

**Figure 4.2 — Immersive Focus Workspace with AI Lesson Notes, Flashcards & Due-Review Queue**

```
+-----------------------------------------------------------------------------+
|  StudyVerse   [ Focus Mode ]   Data Structures & Algorithms        [ Exit ] |
+-----------------------------------------------------------------------------+
|                                                                             |
|  CARD 1 OF 5                                    Box 2   ·   due today       |
|                                                                             |
|  Q.  What invariant does a red-black tree maintain that an AVL tree does     |
|      not?                                                                    |
|                                                                             |
|  [ Show answer ]                                                            |
|                                                                             |
|  AFTER REVEAL                                                               |
|  A.  A red-black tree bounds the black height of every root-to-leaf path;    |
|      an AVL tree bounds the absolute height difference to one.              |
|                                                                             |
|  [ Again ]   [ Hard ]   [ Good ]   [ Easy ]          1 of 5 graded          |
+-----------------------------------------------------------------------------+
```

## 4.2 TELEMETRY DESIGN AND MEASUREMENT INTEGRITY

Telemetry in StudyVerse is defined by a rule rather than by a list of charts: **a displayed number must be recomputable from stored rows.** The rule is worth stating because Version 1.0 violated it, and because the violation was invisible — a percentage on a dashboard looks the same whether it was computed or typed.

Three sources are legitimate. `quiz_attempts` records a scored attempt per quiz per user, so an accuracy figure derived from it is a query over real rows. `study_sessions` records elapsed study time, so minutes and streaks are sums over real intervals. `document_chunks` records the embedding coverage of the corpus, so a coverage figure is a count of non-null embeddings over a count of rows.

Two figures in Version 1.0 had no such source. The **AI-helpfulness index** had no backing signal at all: the platform never asked the student whether an answer helped, and nothing in the schema recorded a proxy for it. The **quiz-accuracy percentage** was not derived from `quiz_attempts`; it was a display value with no query behind it. Both were removed in commit `3773be2`, and the console now shows the counts and coverage figures that can be produced on demand.

The replacement is deliberately boring: counts, sums and ratios, each named after the table it reads. A reader of the admin console can now reconstruct any number on it with one `select`, which is the only standard that survives an examiner's question.

One related correction concerns the tutor log. `ai_tutor_logs` records each tutor turn and whether the response was grounded in retrieved context. That is a real signal, and it is available for analysis; it is not, however, a "helpfulness" score, and the report does not present it as one.

## 4.3 VERIFICATION OF THE VERSION 2.0 UPGRADES

Each upgrade was verified against live infrastructure rather than against a mock. The database used was the project's development instance, the migrations in §3.3.7 and §3.3.8 were applied to it, and the checks were run after application.

**Table 4.1 — Verification Results for the Version 2.0 Upgrades**

| Check | Expected | Observed | Result |
|---|---|---|---|
| Embedding width | 768 components per row | 768 | Pass |
| Relevant vs unrelated similarity | Clear separation | 0.7486 vs 0.5645 | Pass |
| Calibration spread | Non-overlapping ranges | 0.7268–0.7780 vs 0.4404–0.5700 | Pass |
| Retrieval at threshold 0.65 | Only the relevant chunk | One chunk, similarity 0.7459 | Pass |
| Page number persistence | Page stored with the chunk | `page: 12` | Pass |
| Citation without a page | No page clause emitted | `[Source: …]:` only | Pass |
| Scheduler transitions | All grade × box combinations correct | 20 grade × box cases plus 30 invariant cases; 50 of 50 passing | Pass |
| Scheduler regression guard | A regression fails the suite | `npm test` (Vitest), committed test file | Pass |
| Threshold floor | Values inside the noise band rejected or clamped | `0.10` → `0.60` in the clamp test; validator bounds `0.6`–`0.9` | Pass |
| `again` re-queue | Card returns within the same session | Re-inserted at box 1 into the live queue | Pass |
| Review UI round trip | Queue advances and state persists | 0/5 → 1/5; `review_count` 0→1; due 25→24 | Pass |

The scheduler check is now a committed test suite rather than a throwaway harness. `src/lib/spaced-repetition.test.ts` runs under Vitest (`npm test`) and enumerates every grade against each of the five boxes, asserting the resulting box, ease and due offset against the specification in §3.3.10. It adds invariants the original harness did not cover: ease clamped at both bounds, lapse counting, `review_count` increments, a null or out-of-range stored box, the ten-minute minimum delay that stops a corrupted ease value from scheduling a card into the past, ISO 8601 timestamp formatting, and purity of the transition function. The suite reports 50 passing tests in one file. The same file also tests `clampMatchThreshold`, the guardrail that keeps the admin slider out of the measured noise band, so the calibration in §3.3.8 is enforced by code rather than by convention.

The retrieval checks were run against the live corpus. The 768-dimension assertion reads a stored vector directly. The calibration values in Table 3.4 were produced by scoring known-relevant and known-unrelated pairs against that corpus. The end-to-end check embedded a question, called `match_document_chunks` with the threshold at 0.65, and inspected the single returned row: correct document, correct page, similarity 0.7459.

## 4.4 BUILD & STATIC ANALYSIS METRICS

The build and type-check figures below were measured on the development machine at the commit that contains the Version 2.0 changes. They replace the qualitative statements in Version 1.0 ("sub-900 ms compilation", "zero hydration latency", "~524 kB bundle"), which were not reproducible as written.

**Table 4.2 — Build, Type-Check and Bundle Metrics**

| Metric | How measured | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | 5.79 s, 0 errors |
| Unit tests | `npm test` (Vitest 3.2.7) | 50 passed, 0 failed |
| Production build | `npm run build`, wall clock | 5.42 s |
| Vite transform and bundle | Reported by Vite | 799 ms |
| Static client payload | Size of `.output/public` | 6.8 MB |
| Largest gzip client chunk | Largest single JS chunk, gzipped | 142 kB |
| PDF parsing dependency (server lib) | `pdfjs-dist` bundle | 794.86 kB raw / 178.17 kB gzip |
| PDF client chunk and worker | Lazy route chunk | 132 kB gzip, loaded on demand |

Two observations follow from the table. The type-check time and the build time are dominated by different things — the type check is a whole-program analysis, the build is a transform and bundle — so neither can be inferred from the other. And the PDF dependency is large enough that loading it eagerly would be visible to every user, which is why `pdfjs-dist` is imported lazily and its worker is emitted as a separate asset: a student who never opens a document never downloads it.

The earlier claim of "zero hydration latency" is not repeated. What can be asserted is that the dashboard, roadmap and focus routes are server-rendered and their data is fetched through route loaders and server functions, so the first paint includes data rather than a placeholder. Whether a specific navigation is under any particular millisecond boundary was not measured here and is therefore not claimed.

---

# CHAPTER 5: CONCLUSION, FUTURE SCOPE & LIMITATIONS

## 5.1 CONCLUSION

StudyVerse began as an attempt to unify curriculum engineering, retrieval-augmented tutoring and learning analytics in a single application, and Version 1.0 achieved that unification. Version 2.0 did not add surface area; it repaired the foundations that the surface area depended on. The retrieval layer now embeds with a trained model, stores page provenance, retrieves against a calibrated threshold, and cites only what it can substantiate. The review layer now schedules cards instead of merely displaying them. The admin console now shows numbers that a query can reproduce.

The most useful lesson from the work is that these three repairs are the same repair seen from three angles: each replaces a plausible-looking value with a verifiable one. A pseudo-embedding looks like an embedding until its similarity distribution is plotted. A citation without a page looks like a citation until someone tries to check it. An accuracy percentage looks like telemetry until someone asks which table it came from. In each case the correct move was the same — remove the stand-in, accept the louder failure, and rebuild on a source that can be pointed at.

The concrete achievements of the release are:

1. A 768-dimensional embedding pipeline with a declared fallback model, boundary validation on every returned vector, and a hard failure when the provider is unavailable.
2. Page-local chunking that preserves PDF page boundaries and writes `page_number` per chunk, with an explicit null for sources that have no pages.
3. A measured calibration placing the retrieval threshold at 0.65 inside a 0.1568-wide empty gap between the relevant and unrelated similarity distributions.
4. A citation formatter that emits a page locator only when a page exists, validated on both PDF and plain-text sources.
5. A five-box Leitner scheduler with a bounded per-card ease factor, a due-queue index, and an end-to-end verified review round trip.
6. A committed Vitest suite for that scheduler — 50 tests over the full grade × box matrix plus the invariants a hand-checked harness would miss — so a regression fails the build rather than waiting to be noticed.
7. A threshold guardrail that rejects or clamps any configuration inside the measured noise band, enforced at the slider, the validator, the read path and the point of use.

The set is deliberately small. Each item names a behaviour that can be demonstrated in the running application or asserted in a test file, which is the standard §4.3 applies to every other claim in this report.

## 5.2 KEY LIMITATIONS

The following limitations are known and are stated here rather than discovered later:

1. **No automatic re-embedding on model change.** If the embedding model is swapped, existing rows retain vectors from the previous model and the corpus becomes mixed. `embedding_model` records what produced each vector, so the condition is detectable, but no job acts on it.
2. **Scanned PDFs are not supported.** Extraction reads the text layer. A scanned document has no text layer and produces empty pages; there is no OCR stage.
3. **The similarity threshold is global.** `match_threshold` applies to every topic on the platform. A per-topic override would suit corpora with unusually uniform or unusually varied source material, and the schema does not express one. The usable band is now bounded (see below), but it is a single band for the whole platform.
4. **Third-party API dependency.** Both embedding and generation require the Gemini API. Ingestion and tutoring stop when it is unreachable; the platform degrades to its non-AI surfaces rather than substituting a local model.
5. **Large-PDF processing time is client-bound.** Extraction runs in the browser, so a 300-page textbook can occupy a student's tab for a noticeable interval. The page cap prevents an unbounded job but does not make a bounded one fast.

Three limitations that this chapter listed in its first revision are now closed, and the closure is worth recording because each was closed in code rather than in prose.

*The threshold control had no floor.* The slider, the Zod validator, the settings read path and the retrieval call site now all enforce `MIN_MATCH_THRESHOLD = 0.6`, three hundredths above the measured noise ceiling of 0.5700 and roughly a tenth below the signal floor of 0.7268; the upper bound is 0.9. A legacy row written before the guardrail is clamped when it is read, so the earlier configuration cannot reach a query. `clampMatchThreshold` is covered by the same test file as the scheduler.

*The `again` re-queue path was unexercised.* Grading a card `again` re-inserts it at box 1 into the live session queue (`src/routes/_authenticated/review.tsx`), so the card returns within the session rather than only after its ten-minute interval. This is the behaviour §3.3.10 specifies and §4.3 now records as observed.

*No scheduler tests were committed.* `nextSchedule` was extracted from the server-function module into a pure `src/lib/spaced-repetition.ts` and covered by `src/lib/spaced-repetition.test.ts` under Vitest. `npm test` runs 50 cases: the interval ladder, all four grades against all five boxes, ease clamped at 1.3 and 5.0, lapse counting, `review_count` increments, a null or out-of-range stored box, the ten-minute minimum-delay guard, ISO 8601 timestamp formatting and purity of the transition function. A regression now fails the suite instead of surviving until the next manual review.

## 5.3 FUTURE SCOPE

Four directions follow directly from the limitations above:

1. **Add a re-embedding job.** A background job that re-embeds rows whose `embedding_model` no longer matches the active model removes the mixed-corpus failure mode entirely, and would let a model upgrade be a routine operation rather than a migration hazard.
2. **Add an OCR stage behind a feature flag.** Routing a page with no extracted text through a client-side OCR pass would extend support to scanned material without changing the pipeline for documents that already have a text layer.
3. **Per-topic retrieval profiles.** Allowing a topic to carry its own `match_threshold` and `match_count`, defaulting to the global values, would let a homogeneous corpus be tuned without disturbing the platform default. The global bounds and the clamp would remain the outer guard.
4. **Upgrade the scheduler to FSRS-4.5.** The shipped engine is a Leitner ladder with an SM-2 ease factor. A full FSRS model — item stability, retrievability and difficulty in place of a box index — would fit retention more closely, but it needs its own calibration set before it can be trusted over a model that is already measured and tested. It is therefore an upgrade with a prerequisite, not an open defect.

A fifth direction, collaborative study rooms, is out of scope for this release and is not planned against a date.

---

## REFERENCES

1. Brown, T., Mann, B., Ryder, N., et al. (2020). "Language Models are Few-Shot Learners." *Advances in Neural Information Processing Systems*, 33, 1877–1901.
2. Lewis, P., Perez, E., Piktus, A., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *Advances in Neural Information Processing Systems*, 33, 9459–9474.
3. Reimers, N., and Gurevych, I. (2019). "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks." *Proceedings of EMNLP-IJCNLP 2019*, 3982–3992.
4. Leitner, S. (1972). *So lernt man lernen: Der Weg zum Erfolg*. Freiburg: Herder.
5. Woźniak, P. A., and Gorzelanczyk, E. J. (1994). "Optimization of repetition spacing in the practice of learning." *Acta Neurobiologiae Experimentalis*, 54(1), 59–62.
6. Malkov, Y. A., and Yashunin, D. A. (2018). "Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs." *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824–836.
7. Google AI for Developers (2026). *Gemini API: Embeddings and Batch Embedding*. https://ai.google.dev/gemini-api/docs/embeddings
8. Supabase (2026). *pgvector: Vector Similarity Search in Postgres*. https://supabase.com/docs/guides/database/extensions/pgvector
9. TanStack (2026). *TanStack Start and TanStack Router Documentation*. https://tanstack.com/start

*Editorial note.* The reference list in Version 1.0 contained three entries — Aritikula (1994), Bernard (1980) and Shaw (1984) — that were never cited in the body text and did not correspond to any source used in the project. They were template leftovers and have been removed here rather than retained to preserve the count. Version 1.0's literal asterisks around italicised journal titles have also been replaced with real italics.

---

## Source Map (not part of the report)

| Claim in the report | Where it comes from |
|---|---|
| 768 dimensions, model candidates, no silent fallback | `src/lib/embeddings.server.ts` |
| Chunk size, overlap, cap, citation formatter | `src/lib/rag.server.ts` |
| 0.65 / 4 defaults | `src/lib/rag-tuning.ts` |
| Box intervals, `nextSchedule`, due queue | `src/lib/spaced-repetition.ts`, `src/lib/review.functions.ts` |
| Scheduler and threshold-clamp tests | `src/lib/spaced-repetition.test.ts` (Vitest) |
| Threshold floor/ceiling and clamp | `src/lib/rag-tuning.ts`, `src/lib/rag.server.ts` |
| Page extraction, 300-page cap, lazy `pdfjs-dist` | `src/lib/file-extract.ts` |
| `requireAdminRole` | `src/lib/admin.functions.ts` |
| Review state columns, constraints, index | `supabase/migrations/20261117000000_real_embeddings_and_review_state.sql` |
| Calibration values | `supabase/migrations/20261117000100_calibrate_match_threshold.sql` |
| Cascade deletes | `supabase/migrations/20260803010000_cascade_user_deletes.sql` |
| Removal of the two fabricated metrics | commit `3773be2` |
| Dashboard telemetry fix | commit `d418c47` |
| P0/P1 feature set | commit `1839894` |
