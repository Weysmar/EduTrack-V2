# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-10

### Added
- **Focus Page**: A dedicated, distraction-free page for study sessions (`/focus`), featuring a large timer, mode toggles (Work/Short Break/Long Break), and fullscreen support.
- **Library Page**: A dedicated page (`/library`) to list all courses with search functionality, replacing the "See all" link destination.
- **Compact Focus Timer**: A new, smaller timer widget integrated into the App Header for persistent visibility without taking up sidebar space.
- **Login Branding**: Added EduTrack logo and "EduTrack" text to the login/registration page header.

### Changed
- **Dashboard Layout**:
    - Replaced existing layout with a simplified structure.
    - Moved `CalendarWidget` to a full-width container immediately below the Hero section for better readability.
    - Reduced top padding of the dashboard to align visually with the sidebar.
    - Updated "See all" link in "Recent Courses" to point to the new Library page.
- **Focus Widget**: Removed the large Focus Widget from the Sidebar in favor of the new Header Compact Timer.

### Fixed
- **Navigation**: Fixed broken/empty "See all" link in Dashboard.
- **UI Spacing**: Adjusted dashboard margins for a cleaner look.

## [Previous]
- **Homepage**: Implemented Bento Grid layout, Hero section with greetings and streaks, and Quick Actions dock.
- **Performance**: Optimized build times and removed production console logs.
- **Bug Fixes**: Resolved TypeScript errors in CorkBoardCanvas and build warnings.
