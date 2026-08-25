# Chroma Fairy review coverage

Review date: 2026-08-25  
Inventory: 100 rows; 7/7 dimension cells filled for every row.  
Scope is the current `cf/optimization-and-review` branch.

Cell abbreviations are expanded in the table headers. “Reviewed” means the path was checked against the relevant dimension; findings and backlog entries contain the exceptions.

| # | Surface | Access / auth | Integrity | Input / abuse | Correctness / errors | Performance | Schema / RLS | Dead code / flags |
|---:|---|---|---|---|---|---|---|---|
| 1 | `GET /` | Public shell; no privileged data | Static + CMS content | CMS values escaped | Fallbacks reviewed | Landing query reviewed | Public landing policies | Flags/background reviewed |
| 2 | `GET /book` | Public | Booking form only | Booking validation reviewed | Slot failure surfaced | Slot query reviewed | Booking RPC reviewed | Self-booking flag |
| 3 | `GET /checkout` | Public, draft filtered | No write path | Slug constrained | Missing work handled | Single work query | Works RLS | Payments flag |
| 4 | `GET /health` | Public count endpoint | Read-only | No input | Error response reviewed | Count queries | Public read policies | Intentional health route |
| 5 | `GET /inquire` | Public, work draft filtered | Inquiry only | Form validation | Submit failure surfaced | Single work query | Works/inquiry RLS | No dormant path |
| 6 | `GET /shop` | Public, draft filtered | Read-only catalogue | Slugless listing | Query error handled | Unbounded catalogue noted | Works/images RLS | Image strategy reviewed |
| 7 | `GET /shop/[slug]` | Public, draft filtered | Read-only work | Slug route constrained | Not-found handled | Related queries reviewed | Works/images RLS | Payments flag |
| 8 | `GET /robots.txt` | Public static | N/A | No input | Static generation | O(1) | N/A | Intentional |
| 9 | `GET /sitemap.xml` | Public | Read-only | No input | Supabase absence handled | Unbounded works noted | Public RLS | Intentional |
| 10 | `POST /api/errors` | Bearer is informational; persistence server-only | Error rows grouped by RPC | Body size/field sanitation | Self-safe catch | In-memory rate limit | Service-role RPC | Error monitoring path |
| 11 | `GET /studio/login` | Auth entrypoint | No DB write | Browser auth form | Auth error surfaced | Minimal | Auth client | Intentional |
| 12 | `GET /studio/set-password` | Auth handoff | Auth flow | Mode allowlisted | Form path reviewed | Minimal | Auth client | Intentional |
| 13 | `GET /studio` | Middleware + `is_admin` | Read dashboard | No user input | Missing client handled | Small reads | Profiles/RPC | Manager nav flag |
| 14 | `GET /studio/[area]` | Protected layout | Stub only | Area string maps label | Generic fallback | O(1) | Protected parent | Duplicate stub noted |
| 15 | `GET /studio/catalogue` | `is_admin` via layout/RLS | Work/image writes delegated | Admin forms reviewed | Upload/delete errors surfaced | Unbounded reads | Works/images RLS | Catalogue route |
| 16 | `GET /studio/catalogue/new` | Protected + RLS | Draft work creation | Form/file validation | Save errors surfaced | Series query | Works/images RLS | Intentional |
| 17 | `GET /studio/catalogue/[id]` | Protected + RLS | Work/image editing | ID route + form validation | Missing row handled | Related reads | Works/images RLS | Intentional |
| 18 | `GET /studio/customers` | Protected + RLS | Customer edits | Form fields reviewed | DB errors surfaced | Unbounded customer/order reads | Customer/order RLS | Intentional |
| 19 | `GET /studio/inquiries` | Protected + RLS | Status/archive updates | Client fields rendered escaped | Update errors surfaced | Inbox query indexed | Inquiry RLS | Archive link |
| 20 | `GET /studio/inquiries/archive` | Protected + RLS | Restore/archive updates | Client fields rendered escaped | Query errors surfaced | Archive index | Inquiry RLS | Intentional |
| 21 | `GET /studio/insights` | Manager RPC gate | Read-only aggregation | No input | Query error surfaced | Unbounded aggregation noted | Order/customer RLS | Manager-only route |
| 22 | `GET /studio/landing-page` | Admin action/RLS | Section/item limits reviewed | Upload/link limits | Save/delete errors reviewed | Content reads bounded by section | Landing RLS | CMS route |
| 23 | `GET /studio/sales` | Protected + RLS/RPC | Atomic sale RPC | Sale validation reviewed | Errors surfaced | Unbounded reporting reads | Sales RLS/RPC | Intentional |
| 24 | `GET /studio/scheduling` | Protected + RLS | Appointment integrity reviewed | Client validation limited | Save errors surfaced | Unbounded schedule reads | Scheduling RLS | Booking flag |
| 25 | `GET /studio/settings` | Manager RPC gate | Flag update constrained | Key/value validation | Update errors surfaced | Small flag read | Flag RLS | Dormant flags reviewed |
| 26 | `GET /studio/users` | Manager RPC gate | Profile role updates | UUID/role validation | Invite partial state noted | Unbounded profile read | Profile RLS | Role manager path |
| 27 | `submitInquiry` | Public server action + inquiry RLS | Inquiry insert | Length/email/rate checks | Notification best effort | In-memory rate limit | Inquiry insert policy | Known Resend behavior |
| 28 | `requestBooking` | Public action → service RPC | Exclusion constraint fixed F-001 | Input/date/rate checks | Slot errors surfaced; 23P01 mapped | Slot expansion in memory | Service-role RPC + exclusion constraint | Feature-gated |
| 29 | `signOutAdmin` | Auth session | No data mutation | No input | Redirect always | O(1) | Auth client | Intentional |
| 30 | `uploadArtworkImage` | `is_admin` RPC + RLS | DB/storage two-step | MIME/ext/10MB/HEIC | Cleanup warning path | Upload cost bounded | Storage/work-image RLS | Intentional |
| 31 | `deleteCatalogueWork` | `is_admin` + admin client | Sales guard; cleanup gap | UUID validation | Storage warning surfaced | Image lookup bounded per work | Work/image/order FKs | Intentional |
| 32 | `updateLandingSection` | `is_admin` | Section update | Length/key validation | Error returned | O(1) | Landing RLS | Intentional |
| 33 | `upsertLandingItem` | `is_admin` | Count race backlog | Length/media/link validation | Error returned | Count/read/upsert | Landing RLS | Section limits |
| 34 | `deleteLandingItem` | `is_admin` | DB then storage cleanup | UUID validation | Storage error ignored | O(1) + storage | Landing/storage RLS | Intentional |
| 35 | `reorderLandingItems` | `is_admin` | Multi-update race backlog | UUID/list validation | Partial update possible | N updates per reorder | Landing RLS | Intentional |
| 36 | `uploadLandingImage` | `is_admin` | Storage only until reference | MIME/ext/10MB/HEIC | Conversion/upload errors | Upload bounded | Storage RLS | Intentional |
| 37 | `recordSale` | Auth + atomic RPC | Fulfills seeded atomic invariant | Type/amount/date checks | Throws safe error | One RPC | Sales RLS/RPC | Intentional |
| 38 | `updateOrderStatus` | `is_admin` + RLS | Cancel uses locked RPC | UUID/status allowlist | Error returned | O(1) | Order/work RLS/RPC | Intentional |
| 39 | `updateFeatureFlag` | Owner/developer RPC | Existing-key update | Key/bool validation | Error returned | O(1) | Flag RLS; public view exposes key/enabled only | Notes remain manager-only |
| 40 | `inviteAdminUser` | Manager RPC + service client | Auth/profile two-step | Email/role allowlist | Partial invite backlog | O(1) | Profile/auth | Role hierarchy backlog |
| 41 | `updateAdminUserRole` | Manager RPC + service client | Profile update | UUID/role allowlist | Error returned | O(1) | Profile RLS | Role hierarchy backlog |
| 42 | `removeAdminUser` | Manager + self guard | Auth/profile two-step | UUID validation | Partial cleanup surfaced | O(1) | Profile/auth | Intentional |
| 43 | `profiles` table | Self/admin; staff included in admin | Auth FK/cascade | Server writes only | Trigger reviewed | Indexed PK | RLS enabled | Role model reviewed |
| 44 | `series` table | Published public/admin write | Unique slug/FK | Admin form inputs | Trigger reviewed | Slug/order indexes | RLS enabled | Published flag |
| 45 | `works` table | Non-draft public/admin write | Status/FK/checks; sale RPC | Admin form inputs | Trigger reviewed | Status/year/series indexes | RLS enabled | Draft/status flags |
| 46 | `work_images` table | Published-work public/admin | Work FK cascade | Admin upload path | Storage cleanup gap | Work index | RLS enabled | Primary/order fields |
| 47 | `inquiries` table | Admin read/update; direct anon writes revoked F-002 | Work FK set-null | Server action validation and DB length checks | Notification separate | Status/work/date indexes | RLS enabled; no anon SELECT/INSERT | Archive + insert-hardening migrations |
| 48 | `customers` table | Admin only | Unique email/FK | Admin form inputs | RPC/customer updates | Email/order indexes | RLS enabled | Intentional |
| 49 | `orders` table | Admin only | Sale/cancel RPC; FKs | Admin sale validation | Atomic sale verified | Customer index | RLS enabled | Payment flags |
| 50 | `shipments` table | Admin only | Order cascade/enum | Sale shipment validation | RPC insert reviewed | FK only | RLS enabled | Future shipping |
| 51 | `shipping_zones` table | Admin only | Basic columns | Admin-only input | No active writer found | No indexes beyond PK | RLS enabled | Dormant shipping |
| 52 | `availability` table | Admin only | No interval checks | Browser admin input | Save errors surfaced | Starts index | RLS enabled | Self-booking flag |
| 53 | `appointments` table | Admin only; service RPC insert | Exclusion constraint fixed F-001 | Browser/admin input | Overlap rejected by database; error mapped | Starts/customer indexes + GiST exclusion | RLS enabled | Calendar fields dormant |
| 54 | `feature_flags` table | Public key/enabled view; manager notes/admin writes | Key PK/bool | Key/bool action validation | Update errors surfaced | Small table | Base table select restricted; public view granted to public roles | Four dormant flags |
| 55 | `landing_sections` table | Published public/admin write | Unique key/checks | CMS validation | Trigger reviewed | Section key unique | RLS enabled | CMS source |
| 56 | `landing_items` table | Published-section public/admin write | JSON array/check/FK | CMS validation/count race | Multi-update cleanup | Section/order index | RLS enabled | CMS source |
| 57 | `error_events` table | Manager select; service write | Check constraints/FK | Sanitized API/RPC | Service RPC reviewed | Fingerprint/time/user indexes | RLS enabled | Observability |
| 58 | `error_groups` table | Manager select; service write | Count check/PK/FK | Sanitized RPC | Upsert grouping reviewed | Last-seen index | RLS enabled | Observability |
| 59 | `studio_notes` table | Owner-only row policies | Auth FK/checks | Client note limits | Autosave reviewed | User/position index | RLS enabled | Notes feature |
| 60 | `studio_board` table | Admin read; author/manager delete | Auth FK/body check | Client body limits | Delete policy reviewed | Created index | RLS enabled | Shared board |
| 61 | `set_updated_at` RPC/trigger | Trigger-only | Timestamp mutation | No external input | Simple trigger | O(1) | Public schema function | Used broadly |
| 62 | `is_admin` RPC | Auth UID/profile role | Stable definer/search path | No input | Role query reviewed | PK lookup | RLS helper | Staff included |
| 63 | `handle_new_user` trigger | Auth trigger | Profile FK/cascade | Auth provider input | Conflict-safe insert | O(1) | Definer/search path | Intentional |
| 64 | `is_owner_or_developer` RPC | Auth UID role | Read-only | No input | Stable definer | PK lookup | Granted authenticated | Flag gate |
| 65 | `is_user_manager` RPC | Auth UID role | Read-only | No input | Stable definer | PK lookup | Granted authenticated | Manager gate |
| 66 | `record_sale` RPC | Auth/admin check | Row lock + transaction | Typed RPC args | Atomic verified | O(1) plus customer lookup | Grants/RLS reviewed | Active |
| 67 | `cancel_order` RPC | Auth/admin check | Order lock/work restore | UUID RPC arg | Idempotent cancel | O(1) | Grants/RLS reviewed | Active |
| 68 | `request_public_booking` RPC | Service-role grant | Database exclusion constraint fixed F-001 | Server validation | 23P01 mapped to unavailable-slot error | Availability scan | Definer/grant + exclusion constraint reviewed | Feature-gated |
| 69 | `record_error_event` RPC | Service-role only | Event/group transaction | Field truncation/level check | Error-safe caller | Indexed writes | RLS/grants reviewed | Observability |
| 70 | `touch_landing_content` trigger | Trigger-only | Timestamp mutation | CMS row input | Simple trigger | O(1) | Public schema | CMS |
| 71 | `touch_studio_notes` trigger | Trigger-only | Timestamp mutation | Note row input | Simple trigger | O(1) | Public schema | Notes |
| 72 | `diagnose-error` Edge Function | Shared secret; JWT disabled | Read-only Anthropic call | JSON/sanitization/schema checks | 30s timeout/errors | One external call | Function config reviewed | Observation mode |
| 73 | `admin-catalogue.tsx` | Parent/RLS protected | Work/image edits | Forms/uploads | Error states reviewed | Client lists | RLS-backed | Active |
| 74 | `admin-customers.tsx` | Parent/RLS protected | Customer edits | Form fields | Error states reviewed | Client lists | RLS-backed | Active |
| 75 | `admin-inquiries.tsx` | Parent/RLS protected | Status/archive edits | Rendered inquiry data | Update errors | Client list | RLS-backed | Archive mode |
| 76 | `admin-landing-page.tsx` | Parent/server actions | CMS edits | Upload/link/text limits | Save/delete states | Section-bounded | RLS-backed | Active |
| 77 | `admin-mobile-nav.tsx` | Protected UI | No mutation | Route links | UI only | O(1) | Parent gate | Active |
| 78 | `admin-sales.tsx` | Parent/RLS/RPC | Sale/status actions | Sale form validation | Error states | Client lists | RLS-backed | Active |
| 79 | `admin-scheduling.tsx` | Parent/RLS | Schedule edits | Browser validation | Error states | Unbounded lists | RLS-backed | Flagged booking |
| 80 | `admin-set-password.tsx` | Auth invite/reset | Password auth flow | Supabase auth validation | Errors surfaced | O(1) | Auth client | Active |
| 81 | `admin-settings.tsx` | Manager parent | Flag edits | Key/bool validation | Errors surfaced | Small list | RLS-backed | Dormant flags |
| 82 | `admin-sign-out.tsx` | Auth session | Session mutation | No input | Redirect path | O(1) | Auth client | Active |
| 83 | `admin-users.tsx` | Manager parent | Role/invite/remove | Email/UUID/role | Partial states | Client list | RLS-backed | Role backlog |
| 84 | `admin-work-form.tsx` | Parent/RLS | Work/image/series edits | File/form validation | Error states | Related lists | RLS-backed | Active |
| 85 | `animated-fairy.tsx` | Public visual | No data mutation | Props only | Fallback image | O(1) | N/A | Active |
| 86 | `client-error-monitor.tsx` | Public error sender | No business mutation | Sanitized capture | Self-safe | In-memory throttle path | Error RPC protected | Observability |
| 87 | `daily-verse-fit.tsx` | Public rendered text | Read-only | Escaped props | Render only | O(1) | N/A | Active |
| 88 | `daily-verse.tsx` | Server fetched text | Read-only | External data rendered | Fetch fallback reviewed | One fetch | N/A | Active |
| 89 | `global-page-transition.tsx` | Public UI | No data mutation | DOM readiness only | Fail-safe reviewed | Viewport decode gate | N/A | Active |
| 90 | `home-audio.tsx` | Public UI | No data mutation | Browser media events | Error fallback | One audio asset | N/A | Active |
| 91 | `home-client.tsx` | Public CMS renderer | Read-only | HTML injection path escaped | Client enhancement reviewed | Landing render | Landing RLS upstream | Active |
| 92 | `inquiry-form.tsx` | Public form | Delegates inquiry action | Honeypot/fields/time gate | Submit errors | O(1) | Inquiry action/RLS | Active |
| 93 | `inquiry-sound-effects.tsx` | Public UI | No data mutation | Browser events | Audio failure tolerated | Small assets | N/A | Active |
| 94 | `self-booking-form.tsx` | Public form | Delegates booking action | Slot/message fields | Errors surfaced | Slots preloaded | Booking RPC | Feature-gated |
| 95 | `shop-catalogue.tsx` | Public read | Read-only | URL slugs from server data | Empty state | Image lazy loading | Public RLS upstream | Active |
| 96 | `shop-image.tsx` | Public image | Read-only | URL/error fallback | Decode/error state | Responsive sources | Storage transform path | Active |
| 97 | `shop-skeleton.tsx` | Public loading UI | No data mutation | Props only | Loading fallback | O(1) | N/A | Active |
| 98 | `studio-hint.tsx` | Protected UI | No data mutation | Tooltip IDs | Layout effect warning | O(1) | N/A | Active |
| 99 | `studio-notes.tsx` | Protected notes/board | RLS row ownership | Text limits client-side | Autosave errors | Client fetches | Notes/board RLS | Active |
| 100 | `work-inquiry-modal.tsx` | Public form | Delegates inquiry action | Work ID from server route | Submit errors | O(1) | Work/inquiry RLS | Active |

## Coverage limits

The review snapshot was supplemented by Andrew's live read-only checks: appointments had zero rows before the F-001 constraint was installed, and the inquiry hardening permission check confirmed the F-002 direct-write path was closed. The checked-in migrations and hardening SQL record the resulting state.
