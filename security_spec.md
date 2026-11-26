# Security Specification — ZARTHOUGHTS QURAN ACADEMY

## 1. Data Invariants

1. **Identity & Privilege Isolation**: No user may self-assign `role: "super_admin"` or `teacherApproved: true` during profile creation or self-update (except the verified bootstrap admin `zardigitalhub@gmail.com`).
2. **PII Protection**: User profiles (`/users/{userId}`) contain email/phone PII and are strictly readable only by the document owner or a verified `super_admin`. Public teacher listings live in `/public_teachers/{teacherId}` without email/phone.
3. **Teacher Approval Gate**: Only verified `super_admin` users may set `teacherApproved: true` or create/approve `/public_teachers/{teacherId}` entries; unapproved teachers cannot create courses or live classes.
4. **Parental Consent & Child Safety**: Minor accounts (`isMinor: true`) start with `parentalConsentStatus: "pending"` and require a linked guardian (`/guardian_links/{linkId}`) or admin approval to transition to `"approved"`.
5. **Enrollment & Progress Integrity**: An enrollment (`/enrollments/{enrollmentId}`) must reference an existing `/courses/{courseId}` document (`exists(...)`), and `studentId` is immutable after creation.
6. **Temporal Integrity**: All `createdAt` (on create) and `updatedAt` (on create/update) fields must equal `request.time`.
7. **ID & Payload Hygiene**: Every single-document path variable is validated with `isValidId()` (`^[a-zA-Z0-9_\\-]+$`, max 128 chars), every string has explicit `.size()` bounds, and every `create`/`update` enforces `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` to prevent ghost fields.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Self-Privilege Escalation on Create**: Student creates `/users/{uid}` with `role: "super_admin"` and `teacherApproved: true`. -> `PERMISSION_DENIED`.
2. **Role Escalation on Profile Update**: Authenticated student updates `/users/{uid}` changing `role` to `"super_admin"`. -> `PERMISSION_DENIED`.
3. **Ghost Field Injection**: User updates `/users/{uid}` adding `{ "isVerifiedOverride": true }`. -> `PERMISSION_DENIED`.
4. **Email Spoofing Admin Bypass**: Unverified account (`email_verified: false`) with email `zardigitalhub@gmail.com` attempts admin action. -> `PERMISSION_DENIED`.
5. **PII Scraping via List**: Non-admin authenticated user attempts `list` on `/users`. -> `PERMISSION_DENIED`.
6. **Cross-User Profile Read**: User A attempts `get` on `/users/userB`. -> `PERMISSION_DENIED`.
7. **Unapproved Teacher Creating Course**: Teacher with `teacherApproved: false` attempts to create `/courses/{courseId}`. -> `PERMISSION_DENIED`.
8. **Orphaned Enrollment**: User creates `/enrollments/{id}` with non-existent `courseId: "fake_course_999"`. -> `PERMISSION_DENIED`.
9. **Spoofed Enrollment Ownership**: User A creates `/enrollments/{id}` with `studentId: "userB"`. -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation**: User updates `/enrollments/{id}` attempting to change `studentId` or `createdAt`. -> `PERMISSION_DENIED`.
11. **ID Poisoning / Oversized String**: User creates `/quran_progress/{badId}` with 300-char ID or 5000-char `note`. -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: User creates `/contact_messages/{id}` with backdated `createdAt` instead of `serverTimestamp()`. -> `PERMISSION_DENIED`.
