# EduTrack V2 - Refactoring Walkthrough

## Overview
This walkthrough details the comprehensive refactoring of the EduTrack frontend to replace Dexie (IndexedDB) with a robust API-based architecture using React Query and a Node.js/PostgreSQL backend. This transition facilitates real-time data management, cloud synchronization, and improved scalability.

## Key Changes

### 1. Database Abstraction Removal
The local Dexie database (`db.ts`) and all direct database calls have been completely removed. The application now relies entirely on RESTful API endpoints.

### 2. API Integration & State Management
- **Queries:** Centralized API calls in `client/src/lib/api/queries.ts` cover all entities (Courses, Items, Flashcards, Quizzes, Study Plans, Analytics).
- **React Query:** Utilized `useQuery` and `useMutation` hooks in components for efficient data fetching, caching, and state synchronization.
- **Resolving Compilation Errors**

I have successfully resolved all TypeScript compilation and linting errors for both the Client and Server applications.

### Key Fixes
- **Backend**:
  - Standardized authentication middleware usage (`authenticate` vs `authenticateToken`).
  - Corrected `AuthRequest` type definition and exported it.
  - Fixed duplicate keys in controller data objects.
  - Added `dom` library to `tsconfig.json` to fix console errors.

- **Frontend**:
  - Removed obsolete Dexie and SyncManager code.
  - Added missing `createProfile` and `switchProfile` actions to `profileStore`.
  - Added missing `uuid` import in `GenerateExerciseModal`.
  - Cleaned up type mismatches in `GenerateExerciseModal` and `GenerateFlashcardsModal` (removed unsupported `tags`, etc.).
  - Fixed `html2pdf` and `docx` type errors in export hooks.

### Verification
- **Server Build**: `npm run build` (tsc) ✅ Passed
- **Client Build**: `npm run build` (tsc) ✅ Passed

Ready for deployment configuration or further feature development.
- **Zustand Stores:** Refactored `profileStore`, `authStore`, and others to manage client-side state while delegating persistent storage operations to the backend API.

### 3. Component Refactoring
Major components were rewritten to consume the new API:
- **`StudyPlanView`**: Now fetches plans, weeks, and tasks from the API. Logic for generating plans and toggling tasks was updated.
- **`ItemView`**: Refactored to fetch item details and handle deletions via API.
- **`ProfileManager`**: Switching and deleting profiles now interact with the backend auth/profile endpoints.
- **`CourseSettingsModal` & `FolderTree`**: Updated to use `courseQueries.update` for renaming, styling, and moving courses.
- **`GenerateExerciseModal`**: Flashcard and quiz creation now sends payloads to the backend.

### 4. New Features & Infrastructure
- **Analytics:** Integrated `AnalyticsController` and routes to track study sessions and performance server-side.
- **Google Calendar:** Added `GoogleConnectButton` and updated `CalendarPage` to integrate with external calendars (stubbed/ready for backend implementation).
- **PDF Export:** Refactored `usePdfExport` to fetch data via API before generating reports.

## Verification
- **Compilation:** The project compiles successfully (`tsc` check).
- **Linting:** Major linting errors related to missing modules and type mismatches have been resolved.

## Next Steps
- **Backend Implementation:** Ensure all placeholder controllers (Quizzes, Flashcards) are fully implemented with Prisma logic.
- **Testing:** Perform end-to-end testing to verify data flow between frontend and backend.
- **Deployment:** Proceed with Dokploy configuration as planned.
