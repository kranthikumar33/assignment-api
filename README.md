# Assignment App: Backend

Node.js + Express + MongoDB (Mongoose). Auth with JWT.

## Run
1. `npm install`
2. Copy `.env.example` to `.env` and set `MONGO_URI`, `MONGO_URI_TEST` and `JWT_SECRET`.
   Works with local MongoDB or an Atlas URI. `MONGO_URI_TEST` must be a different
   database from `MONGO_URI`, because the tests wipe it.
3. `npm start` (server on http://localhost:3000)
4. `npm test` (uses Node's built-in test runner, 11 tests)
5. Import `postman_collection.json` into Postman and run the requests in order:
   the main story, the other-student 404 check, then the late-submit demo
   (create the 1-minute assignment, start it, wait 61 seconds, then submit).

## Schema
MongoDB has no SQL file, so the schema is the Mongoose models in `src/models/`
(User, Assignment, Attempt). The 3 checks are embedded inside Attempt because
they are always read together with it.

## Endpoints
| Method | Path | Who |
|---|---|---|
| POST | /register | anyone |
| POST | /login | anyone |
| POST | /assignments | admin |
| GET | /assignments | logged-in user |
| POST | /assignments/:id/start | student |
| POST | /attempts/:id/submit | student (own attempt) |
| GET | /attempts/:id | owner or admin |

## Assumptions
- One attempt per student per assignment (unique index). Starting again returns the existing attempt.
- Role is chosen at signup, as the spec says. In production, admin creation would be restricted.
- Server time is the source of truth for deadlines.
- Checks run right after submit, so status goes in_progress -> reviewed.
- Another student's attempt returns 404 (not 403) so its existence is not leaked.
- Expired attempts become timed_out on a late submit or when fetched.

## If 10,000 people used it
- Move checking to a queue + worker (BullMQ) using the `submitted` status.
- Scheduled job to mark expired in_progress attempts as timed_out.
- Rate limit /login and restrict admin signup (invite code).
- Index on attempts.user is already added for listing a student's attempts.