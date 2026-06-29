# Hotel Management System Codebase Audit & Architectural Review

This report presents a thorough, professional architectural and code quality audit of the Hotel Management System (MERN Stack). It identifies technical debt, critical database inconsistencies, security flaws, performance bottlenecks, and provides an actionable roadmap for UI/UX modernization.

---

## 1. Executive Summary
The Hotel Management System is built on a multi-tenant MERN stack architecture designed to support hotel operations (bookings, room status, staff management, inventory, and billing). While the separation between `/client` and `/server` is clear, the application suffers from structural technical debt, outdated dependencies, and critical bugs introduced during schema refactoring. 

### Key Findings
1. **Critical Defect in Check-In/Out Dashboard:** Refactoring bookings to support multi-room bookings (`room_ids` array) broke the room details queries in `Checkinoutcontroller.js`. All dashboards, histories, and no-show processing query `booking.room_id` (which is undefined), rendering room details as `null`/`N/A` and leaving rooms locked in an incorrect status on no-show.
2. **NoSQL Injection Vulnerabilities:** Controller filters use raw query parameters (`req.query`) directly in MongoDB query builders, allowing attackers to inject MongoDB operators (e.g., query objects like `{ $ne: "cancelled" }`).
3. **Layout Architectural Anti-Pattern:** Wrapping individual lazy-loaded routes with `withOperationsLayout` rather than using nested routing causes the main navigation sidebar to unmount and remount on every route change, causing layout shifts and state loss.
4. **Performance Bottlenecks:** The codebase contains severe $N+1$ query patterns in rooms and booking endpoints, fetching room categories sequentially in a loop instead of utilising database joins or in-memory mappings.

---

## 2. Project Architecture & Separation of Concerns

### Folder Structure
- **Backend (`/server`):** Follows a MVC-like layout with `models/`, `routes/`, and `controllers/`. However, it lacks a dedicated service/domain layer. All business logic, input validation, and database operations are tightly coupled inside the controller methods, making unit testing difficult.
- **Frontend (`/client`):** Structured around React components with styling isolated in SASS. Route protection is handled by a custom `RouteIdentifier` and redux states.

### Concerns
- **Layout HOC:** The Higher-Order Component (`withOperationsLayout.js`) wraps lazy-loaded pages individually in `routes.js`. Navigating between `/operations/bookings` and `/operations/rooms/manage` results in a complete destroy-and-rebuild cycle of the layout, including the sidebar and top navigation.
- **Inconsistent Client Services:** The client uses `services/api.js` for Axios setups, but endpoint names are highly verbose and inconsistent (e.g., `bookingAPI.getCheckedIn` vs `bookingAPI.getTodayCheckIns`).
- **Config & Secret Management:** The Axios configuration defaults to `http://localhost:3000/api` with environment injection commented out, creating configuration friction between dev and prod environments.

---

## 3. React Frontend Review

### Outdated Library Ecosystem
The frontend relies on outdated framework versions:
- **React v17.0.2:** Prevents the usage of modern concurrent features (e.g., `useTransition`, `useDeferredValue`) and React 18/19 server components or automatic batching.
- **React Router v5.2.0:** Lacks modern nested routes and native loader/action features, contributing to the layout re-rendering issue.
- **React Table v7.7.0:** Now deprecated in favor of TanStack Table v8, which has better hooks-based state management and TypeScript/JS support.
- **React Bootstrap RC (`2.0.0-rc.0`):** Using an unstable Release Candidate in production exposes the app to UI framework bugs.

### Performance & Rendering Issues
- **Unnecessary Re-renders:** The filters object on pages like `Bookings.js` is stored as raw state. Every change to filtering inputs triggers state recreation, recreation of the `fetchBookings` callback (due to object reference changes), and subsequent effect trigger.
- **Dependency Duplication:** The client imports both `luxon` and `date-fns`, leading to significant, unnecessary bundle size bloat.

---

## 4. Backend & Database Review

### Critical Room ID Bug
During the multi-room refactoring, the `Booking` schema was changed to use a `room_ids` array:
```javascript
room_ids: [{ type: String, required: true }]
```
However, the checkout controller (`Checkinoutcontroller.js`) still contains query logic querying the singular `booking.room_id`:
```javascript
const room = await Room.findById(booking.room_id);
```
Since `room_id` is undefined on all new booking documents, `Room.findById(undefined)` is executed and returns `null`. This breaks the following features:
- `getCurrentlyCheckedIn` (Room number shows as 'N/A' or empty on the UI).
- `getTodayCheckIns` (Room number shows as 'N/A' or empty).
- `getTodayCheckOuts` (Room number shows as 'N/A' or empty).
- `getBookingHistory` (Room number shows as 'N/A' or empty).
- `markNoShow` (Fails to update the room status back to "available" because the room object is null).

### Database Schema Inconsistencies
- **Inconsistent Multi-tenant Keys:** `Booking`, `Room`, and `RoomCategory` use `hotel_id` to separate tenant data. `Inventory` and `Staff` use `user_id`. This inconsistency complicates auth checks.
- **Bad Field Types:** 
  - `Staff.phone_no` is stored as a `Number`, which strips leading zeroes and fails for international codes (e.g. `+91...`).
  - `Staff.birth_date` and `Staff.joining_date` are stored as `String` instead of `Date`, preventing date manipulation at the database level.
- **Missing Database Indexes:** The `Room` collection has no index declarations. Basic lookups like `Room.findOne({ hotel_id, room_number })` require collection scans.
- **Direct Binary / Big Data Storage:** Storing face encodings (`face_encoding` and `face_embeddings`) directly in the `Staff` document increases document size, affecting sequential scan performance.

---

## 5. Security & Error Handling

### NoSQL Injection
In `Bookingcontroller.js` and `Roomcontroller.js`, queries filter results using un-sanitized values directly from `req.query`:
```javascript
const { status, category_id } = req.query;
const filter = { hotel_id: req.user.hotel_id };
if (status) filter.status = status;
```
If an attacker sends a request like `GET /api/rooms?status[$ne]=available`, the query evaluates to `{ status: { $ne: "available" } }`, bypassing standard string matches and exposing hidden records.

### Authentication & Authorization
- **Granular Permissions Validation:** The authorization middleware parses granular staff permissions (e.g., `manage_bookings`). However, there is no centralized schema validator mapping routes to required actions. 
- **DB Lookup on Every Request:** `Authmiddleware.js` verifies the JWT, then queries `HotelAdmin.findById(decoded._id)` on every single request. If the user's role and hotel identity were stored in the JWT payload, DB hits could be halved.
- **Missing Centralized Validation:** Controllers manually check properties (`if (!category_name)`) rather than running request bodies through structured validation schemas (e.g., Joi, Yup, or Express-Validator).

---

## 6. UI/UX Modernization Plan

### Layout & Theme
- **Unified Navigation:** Replace the HOC router structure with React Router nested routing, isolating the sidebar component so it remains static during sub-page swaps.
- **Premium Color Palette:** Modernize the outdated dashboard design with a curated dark/light color palette, using HSL-based colors rather than standard Bootstrap variants. 
- **Table Modernization:** Replace React Table v7 with TanStack Table v8, adding custom styling (rounded corners, subtle hover shadows) and integrating debounced search inputs.

---

## 7. Top 20 Prioritized Issues

| # | Component | Issue Description | Severity | Impact | Remediation |
|---|---|---|---|---|---|
| **1** | Server | Refactoring mismatch: `Checkinoutcontroller` uses `booking.room_id` instead of `booking.room_ids` array. | **Critical** | Room details show up as 'N/A' or blank; room status fails to update on no-show. | Rewrite queries in `Checkinoutcontroller.js` to iterate/map over the `room_ids` array. |
| **2** | Server | NoSQL injection vector via un-sanitized query parameters in `req.query`. | **Critical** | Potential unauthorized data extraction. | Use input validation schemas or cast parameters to strings before querying. |
| **3** | Server | Lack of MongoDB transaction support during atomic bookings/check-out flows. | **High** | Risk of partial updates (e.g., booking saved but room status update fails). | Wrap multi-document updates in Mongoose transaction sessions (`startSession`). |
| **4** | Client | Hardcoded Axios `API_URL` to `localhost:3000` with env variable config commented out. | **High** | Production build fails to talk to remote backend services. | Uncomment environment variable injection in `services/api.js`. |
| **5** | Server | N+1 queries in `Roomcontroller.getRooms` and `Bookingcontroller.getBookings`. | **High** | High latency on listing pages. | Use Mongoose `.populate()` or map categories using an in-memory hash map. |
| **6** | Client | Operations layout HOC causes layout re-rendering and sidebar unmounting on route changes. | **High** | UI flickering, layout shifts, state loss during operations navigation. | Move the operations sidebar to a parent layout route in `routes.js` using nested router switches. |
| **7** | Server | Missing indexes on `Room` collection schema. | **Medium** | Collection scans on every room lookup query. | Add composite unique index `{ hotel_id: 1, room_number: 1 }` and indexes on `category_id` and `status`. |
| **8** | Server | Inconsistent multi-tenant keys: `hotel_id` vs `user_id` across models. | **Medium** | Code maintenance confusion; potential permission check leaks. | Standardize tenant identification as `hotel_id` across all schemas. |
| **9** | Server | `Staff.phone_no` stored as `Number`. | **Medium** | Stripping of leading zeroes; numeric overflow on international numbers. | Refactor field type to `String` with regex validation. |
| **10** | Server | Dates (`birth_date`, `joining_date`, `attandance.date`) stored as `String` in `Staff` schema. | **Medium** | Prevents DB-level range queries, sorting, and reporting. | Migrate schemas and records to native `Date` types. |
| **11** | Client | Outdated React (v17) and React Router (v5). | **Medium** | Prevents use of modern performance tools and clean hooks APIs. | Upgrade codebase to React 18+ and React Router v6. |
| **12** | Client | Dependency bloat: Duplicated date libraries (`date-fns` and `luxon`). | **Medium** | Large bundle size; slow initial page load. | Standardize on one date library (e.g., `date-fns`) and remove the other. |
| **13** | Server | JWT verification does database lookup on every request. | **Medium** | Heavy database load. | Store non-sensitive authorization parameters (`role`, `hotel_id`) directly in JWT. |
| **14** | Client | Insecure storage of sensitive user metadata in `localStorage`. | **Medium** | Risk of XSS session hijacking. | Move user session validation to secure HTTP-only cookies. |
| **15** | Server | Missing centralized input validation library. | **Medium** | Duplicated boilerplate code; incomplete body validations. | Integrate an express validator middleware like Joi or Express-Validator. |
| **16** | Server | Hardcoded Mock Data in `Analyticscontroller.js` for Customer Satisfaction. | **Low** | Static ratings display on the live analytics dashboard. | Connect to a reviews/ratings schema or remove the mock interface. |
| **17** | Server | Typo in DB Schema: `attandance` instead of `attendance`. | **Low** | Code maintainability and vocabulary confusion. | Run migration script to rename field to `attendance` on DB and server files. |
| **18** | Client | Deprecated `react-table` v7 used. | **Low** | Blocked on updates; outdated API. | Migrate to TanStack Table v8. |
| **19** | Server | Redundant face encoding fields (`face_encoding` and `face_embeddings`). | **Low** | Wasted MongoDB document space. | Clean up and consolidate into a single face embeddings vector field. |
| **20** | Server | Dummy NPM package `http` installed in `package.json`. | **Low** | Unused package installation overhead. | Remove `http` dependency from `server/package.json` since HTTP is native to Node. |

---

## 8. Grading & Scorecard

### Evaluation Rubrics
1. **Architecture & Separation of Concerns (6/10):** Standard MVC directories present, but routing/layout coupling issues and lack of separate service layer drag down the maintainability rating.
2. **React Code & State Quality (7/10):** Decent use of Redux Toolkit, but outdated routing and layout HOC lifecycle issues reduce usability.
3. **Database Schema & Indexing (5/10):** Critical mismatch bugs, missing indexes on core tables (Room), and poor data types (numbers for phones, strings for dates) need refactoring.
4. **Performance & Optimization (6/10):** N+1 query patterns present in lists, duplicate date libraries on the frontend, and frequent database lookup hooks on JWT auth.
5. **Security & Input Validation (5/10):** Open to NoSQL injection and lacking centralized body validators on request parameters.

### Overall Score: **5.8 / 10** (Satisfactory / Needs Refactoring)
*The system functions at a basic level, but the database room lookup mismatch (Issue #1) breaks several core administrative screens. Fixing the checkout controller bug and sanitizing query parameters against NoSQL injections are the most critical steps to take before deploying.*
