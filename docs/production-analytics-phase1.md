# Phase 1 — production analytics foundation

Base: production `main`, `ee97f60dfe160256a85c414c4f3cdd7dc0c33afa`.
Worktree: `C:/Dev/Jobsearch/.claude/worktrees/analytics-production`.
No deployment, remote migration, production signup, payment, or GA4 test transmission was performed.
Recruiter development is outside this change.

Failure-isolation correction: no analytics trigger is installed on auth.users. Account discovery and purchase recovery run in the analytics worker; product telemetry runs after the response using Next.js after(). Browser operations do not await SDK capture or tracking requests. The migration remains unapplied. The pre-existing build and live configuration verification requirements remain open.

## 1. Files changed

- `lib/analytics-policy.ts`: shared production/internal-user checks, identity validation, ecommerce payloads.
- `lib/analytics-identity.ts`: bounded `gtag('get')` client/session capture, current-session cookie, signup metadata.
- `lib/ga4.ts`: durable enqueue, signup observation, atomic delivery claim, delivery status handling.
- `lib/analytics-background.ts`, `lib/analytics-browser.ts`, `lib/analytics-reconcile.ts`: isolated post-response work, non-awaited browser notifications, and scheduled recovery.
- `lib/stripe-analytics.ts`: verified live paid candidate-purchase policy and transaction key.
- `lib/analytics.ts`, `lib/server-analytics.ts`: remove overlapping GA4 sends; retain separate Meta/LinkedIn calls.
- `components/AnalyticsIdentity.tsx`, `app/layout.tsx`: production-only Google tags, authenticated UUID, identity refresh.
- `components/AttributionCapture.tsx`, `app/api/attribution/route.ts`: first-touch marketing no longer writes GA identity.
- `components/AuthPanel.tsx`, `components/landing/HomepageOnboardingModal.tsx`, `app/claim-free-account/page.tsx`, `app/auth/callback/route.ts`, `app/api/track/signup/route.ts`: creation metadata and durable signup observation instead of age heuristics; claim-page diagnostics.
- `app/api/analytics/identity/route.ts`, `app/api/analytics/dispatch/route.ts`, `vercel.json`: authenticated identity enrichment and protected outbox dispatch.
- `app/api/checkout/route.ts`, `app/api/checkout/guest/route.ts`, `app/api/webhooks/stripe/route.ts`: current identity on checkout, checkout event, authoritative paid purchase and retry handling.
- `app/checkout/initiate/page.tsx`, `app/checkout/guest/page.tsx`, `components/CheckoutButton.tsx`: use the current identity maintained independently by the root identity component.
- `app/checkout/success/page.tsx`, `app/checkout/success/PurchaseTracker.tsx`, `app/api/analytics/purchase/route.ts`: render the return page immediately, then verify Stripe asynchronously for the remaining Meta browser event; no GA4 purchase from this page.
- `app/api/profile/documents/route.ts`, `app/api/quick-start/route.ts`, `app/api/jobs/route.ts`, `app/api/grab/import/route.ts`, `app/api/applications/[id]/generate/route.ts`: success-only funnel events and checked document persistence.
- `components/AddJobForm.tsx`, `components/DocumentsForm.tsx`, `components/QuickApplyForm.tsx`, `components/OnboardingWizard.tsx`, `components/GrabPanel.tsx`, `components/DashboardTabs.tsx`, `components/GenerateButton.tsx`, `components/ApplicationActions.tsx`: business requests no longer await identity capture.
- `supabase/migrations/20260924120000_production_analytics_foundation.sql`: account ledger, event outbox, first-analysis marker, rollout cutoff, independent marketing claims, identity allowlist constraints, and service-only discovery/reconciliation functions.
- `tests/*.test.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`: automated SQL, route, transport, policy, and component tests.
- This report.

## 2–3. Events and exact triggers

| Event | Trigger | Identity / parameters |
| --- | --- | --- |
| `page_view` | Production Google tag; initial page load and stream-configured history changes | Authenticated UUID where available. Verify enhanced measurement in GA4. |
| `sign_up` | Background discovery of a committed `auth.users` row created after this migration. Email accounts carry production context at creation; Google birth records become eligible after the production callback. Guest-purchase accounts carry verified checkout context. | One account UUID; creation timestamp, `method=email` or `google`, `signup_source=claim_free_account`, `resume_tools`, or `other`. Confirmation is not another account creation. |
| `resume_uploaded` | File storage and the `master_resumes` row both succeed, via profile documents or quick-start | Opaque resume record key; no file name/content in GA4. Pasting/editing text is not a file upload. |
| `job_added` | Job and application creation succeed through manual jobs, quick-start, or grab/import | Opaque job record key. |
| `analysis_completed` | AI response, application save, document insert, and existing required credit operation all succeed | `is_first_analysis=true` for the first measured successful analysis; false thereafter. Historical users with saved tailored resumes are seeded as already analysed. |
| `document_generated` | Same successful operation, after checking the document insert result | One event per `tailored_resume` and `cover_letter`. Regeneration is another generation. |
| `begin_checkout` | Stripe creates a live checkout session with a URL | Current client/session identity; session ID, AUD value, valid item array. Failed or test checkout creates no production GA4 event. |
| `purchase` | Signature-verified Stripe webhook with live candidate `mode=payment`, `payment_status=paid`, production checkout metadata, resolved account/entitlement | Session ID as transaction ID; Stripe amount and currency; valid ecommerce item array. Background recovery verifies the session with Stripe and uses charge time when available (otherwise session creation time). Completed/repeated/delayed-success notifications share one key. |
| `signup_page_viewed` | Claim-page component mounts | Fixed `form_placement=page`. |
| `signup_form_started` | First change in each claim form | `form_placement=hero` or `footer`. |
| `signup_error` | Native field validation, password-policy failure, or signup failure | Fixed `error_code`; never error text, email, name, or field value. |
| `signup_confirmation_required` | Successful non-session signup response requiring confirmation, excluding known empty-identities existing-account responses | Form placement. Same UX as before. |

Existing ATS/blog/navigation/credit events remain. Their previous semantics are not expanded by this phase.
Meta browser registration/purchase and server Meta/LinkedIn conversions remain separate from GA4.

The funnel is `page_view → sign_up → analysis_completed [is_first_analysis=true] → document_generated → begin_checkout → purchase`.
Analysis and documents currently finish together. Use user-level steps so two document types do not double the funnel's people count. Guest checkout is a separate legitimate path that can precede analysis.

## 4. Deduplication and delivery

- Signup birth records are discovered from committed auth rows using a fixed rollout timestamp. No analytics work runs in an auth insert transaction. No timestamp-age guess, browser success event, login, or token refresh creates a new birth record. No existing accounts are backfilled as signups.
- Unique outbox key `signup:<user UUID>` allows one signup record. Callback/OTP/request retries only enrich missing identity. A separate marketing_signup_claims table avoids repeating server registration conversions without depending on GA ledger/outbox success.
- Purchase key `purchase:<Stripe session ID>` is unique. Retried webhooks can repair a missing outbox write even when the entitlement already exists. Enqueue failure never affects webhook acknowledgement. The scheduler can recover missing paid events by verifying fulfilled sessions directly with Stripe.
- Resume/job keys use saved row IDs. Analysis/generation keys identify the completed generation. First-analysis assignment uses a database advisory lock and unique per-user marker.
- Workers atomically transition `pending → sending` before calling Google. Concurrent workers cannot both transmit a row.
- Successful HTTP receipt becomes `sent`; a non-2xx response becomes `rejected`; network ambiguity becomes `uncertain`. A process interruption after claiming can leave `sending`. These states are **not automatically replayed**.
- This guarantees one application transmission attempt per event, not exactly-once ingestion by an external service. GA4 has no general signup idempotency API. Automatically retrying an ambiguous signup would recreate the duplicate problem. Review quarantined rows manually; a 2xx response alone does not prove GA4 accepted a valid event.
- Eligible pending rows are dispatched after responses and by a protected five-minute cron. Missing client identity stays visible as pending; the dispatcher does not invent a synthetic browser. Events older than 72 hours become `expired`.
- Do not automatically reset `sent`, `sending`, or `uncertain` signup rows to pending. Purchases retain their transaction IDs for reconciliation and any explicitly reviewed replay.

## 5. Tests

Failure-isolation update: **119 tests passed across 13 files**. Added rejection, never-resolving analytics, unavailable scheduler, unavailable analytics tables, guest fulfilment, browser SDK/storage failure, independent marketing claims, identity allowlist, and background recovery coverage. These are isolated tests, not live-provider validation.

Commands: `npm test`, `npm exec tsc -- --noEmit --incremental false`, `npm run build -- --webpack`.

Results before the failure-isolation correction: **67 tests passed across 9 files**; standalone TypeScript and `git diff --check` passed. The webpack build compiled and passed TypeScript, but failed collecting `/_not-found` page data with `TypeError: d.createContext is not a function`. An isolated, unchanged archive of production commit `ee97f60` reproduced the same failure using the installed dependencies. The default Turbopack build also encounters an invalid local Windows SWC binary. A successful target-platform production build remains required; these results do not constitute a passing full build.

Automated coverage includes:

- In-memory PostgreSQL execution of the actual migration, account discovery, RPCs, permissions, identity constraints and first-analysis seed; unavailable analytics tables do not prevent account creation.
- Immediate email creation, confirmation, OTP observation, Google birth/callback, returning pre-rollout login, duplicate observations, marketing claim isolation.
- Concurrent delivery claims; rejected/ambiguous transport; missing identity; stale cookie; expired events; admin/founder/preview exclusions.
- Live checkout creation, failed checkout, Stripe test checkout, current rather than historical identity.
- Verified webhook, invalid signature, repeated webhook with existing entitlement, delayed-payment notification, test payment retaining existing entitlement behavior while producing no production conversion.
- Forged success URL, verified amount overriding URL amount, repeated success rendering, test return; browser helpers never emit GA4 signup/purchase.
- AI failure, application-write failure, document-write failure, credit-operation failure: no completion events. Successful generation: analysis plus two persisted document types.
- Actual claim-page React components in jsdom at 390px and 1440px: both forms, first interaction, confirmation, validation, service error, immediate session. Diagnostics contain no submitted values. These are component tests, not a full browser layout or external-auth test.

Live Supabase/Google OAuth/email/Stripe/GA4 integration still requires an isolated staging exercise. No production account, purchase, or GA4 test event was created here.

## 6. Required migration and configuration

1. Apply `20260924120000_production_analytics_foundation.sql` to the production Supabase project before the application release. It changes analytics tables/functions only; no pricing or entitlement schema changes.
2. Keep existing `SUPABASE_SERVICE_ROLE_KEY`, Supabase URL/key, Stripe secret/webhook secret, Meta and LinkedIn configuration.
3. Set production-only `GA4_API_SECRET` for stream `G-R1ZFGNBD6D`. The browser and server now use this one fixed production measurement ID; a differing legacy `NEXT_PUBLIC_GA_MEASUREMENT_ID` no longer changes server routing.
4. Set a strong production-only `CRON_SECRET`. Vercel supplies it as the dispatch job's Bearer authorization.
5. Optionally set `GA4_INTERNAL_USER_IDS` to comma-separated Supabase UUIDs for staff/test accounts whose role is otherwise `user`. `admin` and `founder` are excluded automatically.
6. Vercel supplies `VERCEL_ENV=production`; local runs and preview deployments remain disabled. Hostname must also be `koalapply.com` or `www.koalapply.com` for browser initialization. Google Ads ID remains `AW-18405510825`.
7. `vercel.json` schedules dispatch every five minutes. Confirm the Vercel plan supports this frequency (Hobby does not); alternatively arrange an authorized external scheduler before removing/replacing the cron configuration. Do not silently deploy without a dispatcher: unconfirmed email creations rely on it.
8. Test dependencies are development-only: Vitest, PGlite, jsdom, Testing Library. No production analytics SDK was added.

## 7. Manual GA4 Admin work

- Inspect and disable any GA4 Create/Modify Event rules or GTM tags that independently manufacture signup/purchase events. Application changes cannot remove remote rules.
- Confirm `sign_up` and `purchase` are key events. Decide whether first analysis is an additional key event; avoid marking mere form starts/errors as conversions.
- Register event-scoped custom dimensions needed for reporting: `is_first_analysis`, `document_type`, `signup_source`, `form_placement`, `error_code`, `identity_status`. `identity_status` is `client_and_session` or `client_only`; records without client ID remain in the outbox.
- Configure payment processor hosts observed in reports, including `checkout.stripe.com` where applicable, as unwanted referrals. This does not repair historical attribution or missing identities.
- Verify enhanced-measurement page views on client-side navigation and appropriate form measurement. Avoid counting automatic form events as successful accounts.
- Check apex/www identity continuity, existing Google Ads link/conversion imports, and any cross-domain configuration for owned sites. Do not blindly add hosted Stripe Checkout as an owned tagged domain.
- Configure internal/developer filters and inspect in test mode before activating destructive reporting filters. Application-level guards complement them.
- Build a user-level funnel and segment device category, signup source, and channel. Analyse guest checkout separately.
- Validate representative payloads with the Measurement Protocol debug endpoint in staging; inspect DebugView/Realtime and then processed reports. Do not send staging events to this production stream.

## 8. Manual Stripe Dashboard work

- Ensure the production endpoint `/api/webhooks/stripe` receives `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Verify live-mode endpoint signing secret matches production configuration. Keep test secrets and test checkout outside production.
- No price, product, entitlement, checkout-mode, or recruiter subscription setup changes are required.
- Checkout sessions created before this release lack `analytics_environment=production` and are intentionally not retroactively reported by the new purchase path. Reconcile any in-flight sessions at rollout separately.

## 9. Limits and risks

- Exactly-once external ingestion cannot be promised. Quarantine uncertain delivery rather than blindly inflate conversions; monitor outbox states and Google reports.
- Users blocking GA or storage may have no usable client/session identity. Their business action is real, but GA4 cannot reliably attribute it. Signup rows can be enriched later within the GA backdating window; other rows retain the identity available at the operation.
- Session attribution has a shorter window than event backdating. Late confirmations/events can be valid but no longer attach to the original session. Do not fabricate engagement time or campaign attribution; server events use zero browser engagement duration.
- Auth migration must precede code. Accounts created by stale pre-release clients during rollout may be excluded; deploy promptly and annotate the measurement cutover.
- Admin identity is unknown on anonymous visits. GA4 internal-traffic settings and explicit staff IDs are still needed.
- Product-operation enqueue happens after the domain write and is non-blocking on telemetry failure; failure is logged and should be monitored. Signup and purchase discovery can recover after telemetry outages within the reporting window; product telemetry remains best-effort after-response work.
- Candidate entitlement behavior is preserved, including existing handling of completed sessions. This phase does not redesign delayed-payment fulfillment. The new async-payment branch records analytics for an already-fulfilled session; it does not grant another entitlement.
- Application content and generated-document rows are still separate writes. Document insert failure now produces an error and no completion event, while the existing credit operation remains in the same order. Making all generation/credit writes transactional is a separate change.
- Google Ads configuration and separate Meta/LinkedIn conversions are retained; their own attribution/deduplication policies are outside the GA4 guarantee.
- The local production build result and baseline comparison must be reviewed before deployment; passing tests/typecheck does not replace a successful target-platform build.

## 10. Deployment and verification checklist (not executed)

- [ ] Review this diff against `ee97f60`; confirm recruiter branch/files remain untouched.
- [ ] Resolve/verify the target-platform production build; complete isolated staging auth/payment smoke tests.
- [ ] Back up migration metadata; apply only the new analytics migration to the correct Supabase project.
- [ ] Verify service-only permissions, account discovery, first-analysis seed, and cron authorization.
- [ ] Set production secrets/internal UUID list and confirm supported scheduler frequency.
- [ ] Review GA4 duplicate rules, key events, custom dimensions, referrals, and Stripe webhook subscriptions.
- [ ] Obtain deployment approval, then release this production-based change only.
- [ ] Verify localhost, preview, internal accounts, and test transactions generate no production GA4 traffic.
- [ ] Verify one new account creates one ledger/outbox signup; confirmation, login, refresh, and OTP retry add none.
- [ ] Verify page/form diagnostics, resume upload, manual/quick-start/imported jobs, first/subsequent analyses, and both document types.
- [ ] Verify current client/session IDs survive checkout and the paid webhook shares those IDs and the authenticated UUID.
- [ ] Verify one checkout session produces one purchase row/transaction; replaying webhook or refreshing return page does not duplicate GA4 purchase.
- [ ] Confirm dispatcher execution and inspect pending/no-identity, sending, uncertain, rejected, excluded, and expired rows.
- [ ] Compare a small cohort with Supabase account/document records and Stripe live payments, then check processed GA4 data after its normal processing delay.
- [ ] Annotate the cutover date. Do not compare old inflated signup event totals directly with the new account-creation definition.

Read-only monitoring example:

```sql
select event_name, status, count(*)
from public.ga4_outbox
group by event_name, status order by event_name, status;

select event_key, event_name, occurred_at, status, attempted_at
from public.ga4_outbox
where status in ('sending','uncertain','rejected','expired')
order by occurred_at;
```
