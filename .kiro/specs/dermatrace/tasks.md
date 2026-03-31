# Implementation Plan: DermaTrace

## Overview

Incremental implementation of DermaTrace — a freemium skincare reaction tracking SaaS. Tasks are ordered by dependency: monorepo scaffold → database → auth → core features → AI layer → payments → offline sync → mobile screens → deployment. Each task builds directly on the previous ones and ends with all components wired together.

Tech stack: React Native (iOS + Android) · Python + FastAPI · Supabase (PostgreSQL) + SQLAlchemy · Pandas + Scikit-learn · Stripe + PayPal · WatermelonDB · Railway/Render + EAS Build.

---

## Tasks

- [x] 1. Monorepo scaffold and project structure
  - Create monorepo root with `backend/` and `mobile/` directories
  - Add root `package.json` (workspaces) and `.gitignore`
  - Initialize `backend/` as a Python project: `pyproject.toml` (or `requirements.txt`), `README.md`
  - Initialize `mobile/` as a React Native project via React Native CLI
  - Add `.env.example` files for both `backend/` and `mobile/`
  - _Requirements: 9.4_

- [x] 2. Backend scaffold (FastAPI + project layout)
  - [x] 2.1 Create FastAPI application skeleton
    - Create `backend/app/main.py` with FastAPI app instance, CORS middleware, and health-check route `GET /health`
    - Create `backend/app/config.py` loading all env vars (`DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
    - Create `backend/app/dependencies.py` with `get_db` async session dependency
    - Create directory structure: `app/routers/`, `app/models/`, `app/schemas/`, `app/services/`, `app/tests/unit/`, `app/tests/property/`, `app/tests/integration/`
    - _Requirements: 9.3, 9.4_

  - [x] 2.2 Configure SQLAlchemy async engine and session
    - Create `backend/app/database.py` with async SQLAlchemy engine pointed at `DATABASE_URL`
    - Create `AsyncSession` factory and `Base` declarative base
    - _Requirements: 9.3_

- [x] 3. Database schema and Alembic migrations
  - [x] 3.1 Define SQLAlchemy ORM models
    - Create `backend/app/models/user.py`: `User` model (`id` UUID PK, `email` unique, `password_hash`, `subscription_tier` enum, `trial_ends_at`, `subscription_ends_at`, `billing_interval`, `created_at`, `updated_at`)
    - Create `backend/app/models/profile.py`: `Profile` model (`id`, `user_id` FK, `skin_type`, `known_allergies`, `sensitivity_level`, `updated_at`)
    - Create `backend/app/models/product.py`: `Product` model (`id`, `user_id` FK, `name`, `brand`, `ingredients` JSONB, `image_url`, `is_catalog`, `created_at`)
    - Create `backend/app/models/reaction.py`: `Reaction` model (`id`, `user_id` FK, `reaction_date`, `severity`, `symptoms` TEXT[], `notes`, `created_at`) and `ReactionProduct` association table
    - Create `backend/app/models/trigger_result.py`: `TriggerResult` model (`id`, `user_id` FK, `ingredient`, `confidence_score`, `analyzed_at`)
    - Create `backend/app/models/transaction.py`: `Transaction` model (`id`, `user_id` FK, `payment_method`, `external_tx_id`, `amount`, `currency`, `status`, `created_at`)
    - _Requirements: 4.7, 5.1, 9.2, 13.10_

  - [x] 3.2 Initialize Alembic and create initial migration
    - Run `alembic init` in `backend/`
    - Configure `alembic.ini` and `env.py` to use async SQLAlchemy engine and `DATABASE_URL`
    - Generate initial migration covering all six tables
    - _Requirements: 4.7_


- [x] 4. Authentication service
  - [x] 4.1 Implement auth Pydantic schemas and password utilities
    - Create `backend/app/schemas/auth.py`: `RegisterRequest`, `LoginRequest`, `TokenResponse` Pydantic models with field validators (email format, password ≥ 8 chars, max 10,000 chars)
    - Create `backend/app/services/auth_service.py`: `hash_password` (bcrypt cost 12), `verify_password`, `create_access_token` (HS256, 24h expiry with `sub`, `email`, `tier` claims), `decode_token`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 9.2, 9.5_

  - [ ]* 4.2 Write property tests for auth service (Properties 1–5)
    - **Property 1: Password Storage Security** — for any valid registration input, stored hash is valid bcrypt with cost ≥ 12 and never equals plaintext
    - **Property 2: JWT Issuance on Authentication** — for any successful auth event, returned JWT is decodable, contains correct `sub`, expiry ≈ now + 24h (±60s)
    - **Property 3: Duplicate Email Rejection** — for any already-registered email, re-registration returns HTTP 409
    - **Property 4: Invalid Credentials Rejection** — wrong password or unknown email returns HTTP 401
    - **Property 5: Expired Token Rejection** — any JWT with past `exp` returns HTTP 401 on protected endpoints
    - Create `backend/app/tests/property/test_auth_properties.py` using `hypothesis`
    - **Validates: Requirements 1.1, 1.2, 1.5, 2.1, 2.2, 2.3, 2.5, 9.2**

  - [x] 4.3 Implement auth router and JWT middleware
    - Create `backend/app/routers/auth.py`: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
    - Register router in `main.py`
    - Create `backend/app/dependencies.py`: `get_current_user` FastAPI dependency that decodes Bearer JWT and returns user; raises HTTP 401 on missing/invalid/expired token
    - Add `slowapi` rate limiting on auth endpoints
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 9.1_

  - [ ]* 4.4 Write unit tests for auth router
    - Test register success, duplicate email 409, invalid email 422, short password 422
    - Test login success, wrong password 401, unknown email 401
    - Test protected endpoint with missing/expired token 401
    - Create `backend/app/tests/unit/test_auth.py`
    - _Requirements: 1.1–1.5, 2.1–2.5, 9.1_

- [x] 5. User profile service
  - [x] 5.1 Implement profile schemas, service, and router
    - Create `backend/app/schemas/profile.py`: `ProfileResponse`, `ProfileUpdateRequest` with enum validators for `skin_type` (normal, dry, oily, combination, sensitive) and `sensitivity_level` (low, medium, high)
    - Create `backend/app/services/profile_service.py`: `get_profile`, `upsert_profile`
    - Create `backend/app/routers/profile.py`: `GET /profile`, `PUT /profile` (both protected)
    - Register router in `main.py`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.2 Write property tests for profile (Properties 6–7)
    - **Property 6: Profile Update Round-Trip** — for any valid profile update, GET after PUT returns same values
    - **Property 7: Enum Validation Rejection** — any skin_type or sensitivity_level outside accepted enums returns HTTP 422
    - Create `backend/app/tests/property/test_profile_properties.py`
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

  - [ ]* 5.3 Write unit tests for profile router
    - Test GET profile returns all fields, PUT persists changes, invalid enum returns 422
    - Create `backend/app/tests/unit/test_profile.py`
    - _Requirements: 3.1–3.5_

- [x] 6. Product service
  - [x] 6.1 Implement product schemas, service, and router
    - Create `backend/app/schemas/product.py`: `ProductCreateRequest` (name required, brand, ingredients list, image_url), `ProductResponse`
    - Create `backend/app/services/product_service.py`: `create_product`, `list_products`, `delete_product` (ownership check → 403)
    - Create `backend/app/routers/products.py`: `POST /products` (201), `GET /products`, `DELETE /products/{id}` (204)
    - Register router in `main.py`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 6.2 Implement image upload to Supabase Storage
    - Add `upload_product_image` helper in `product_service.py` using `SUPABASE_SERVICE_KEY` and `SUPABASE_URL` to upload to the `product-images` bucket and return a public URL
    - Wire into `POST /products` when `image` multipart field is present
    - _Requirements: 4.6_

  - [ ]* 6.3 Write property tests for products (Properties 8–10)
    - **Property 8: Product Creation and Retrieval Round-Trip** — create product, GET list includes product with same name/brand/ingredients
    - **Property 9: Product List Completeness** — after creating N products, GET list returns exactly N items
    - **Property 10: Product Ownership Enforcement** — user B cannot delete user A's product; returns 403 and product remains in user A's list
    - Create `backend/app/tests/property/test_product_properties.py`
    - **Validates: Requirements 4.1, 4.3, 4.5, 5.2**

  - [ ]* 6.4 Write unit tests for product router
    - Test create success 201, missing name 422, list returns all, delete 204, delete wrong owner 403
    - Create `backend/app/tests/unit/test_products.py`
    - _Requirements: 4.1–4.7_

- [x] 7. Reaction service
  - [x] 7.1 Implement reaction schemas, service, and router
    - Create `backend/app/schemas/reaction.py`: `ReactionCreateRequest` (date, severity enum, symptoms list, product_ids list, optional notes), `ReactionResponse`
    - Create `backend/app/services/reaction_service.py`: `create_reaction` (validates all product_ids belong to current user → 403; validates severity enum → 422), `list_reactions` (ordered by date desc)
    - Create `backend/app/routers/reactions.py`: `POST /reactions` (201), `GET /reactions`
    - Register router in `main.py`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 Write property tests for reactions (Properties 11–12)
    - **Property 11: Reaction Creation Round-Trip** — create reaction, GET history includes reaction with same field values
    - **Property 12: Reaction History Ordering** — reactions with different dates are returned most-recent-first
    - Create `backend/app/tests/property/test_reaction_properties.py`
    - **Validates: Requirements 5.1, 5.4, 5.6**

  - [ ]* 7.3 Write unit tests for reaction router
    - Test create success 201, foreign product_id 403, invalid severity 422, list ordering
    - Create `backend/app/tests/unit/test_reactions.py`
    - _Requirements: 5.1–5.6_

- [x] 8. Checkpoint — core CRUD complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Dashboard aggregation service
  - [x] 9.1 Implement dashboard service and router
    - Create `backend/app/services/dashboard_service.py`: single `get_dashboard` function that runs four aggregation queries: (a) chronological timeline of products + reactions, (b) reaction counts per day for past 30 days, (c) top 3 products by reaction count, (d) top 3 symptoms by frequency
    - Create `backend/app/routers/dashboard.py`: `GET /dashboard` (protected)
    - Register router in `main.py`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 9.2 Write property test for dashboard (Property 13)
    - **Property 13: Dashboard Aggregation Correctness** — timeline is chronological, chart dates within past 30 days, top_products ≤ 3 and highest reaction counts, top_symptoms ≤ 3 and most frequent
    - Create `backend/app/tests/property/test_dashboard_properties.py`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]* 9.3 Write unit tests for dashboard router
    - Test empty state (no products/reactions), populated state with known data, chart date range boundary
    - Create `backend/app/tests/unit/test_dashboard.py`
    - _Requirements: 6.1–6.4_

- [x] 10. Ingredient parser
  - [x] 10.1 Implement ingredient parser service and router
    - Create `backend/app/services/ingredient_parser.py`: `parse_ingredients(raw: str) -> list[str]` — splits on commas and forward slashes, strips whitespace, rejects empty string with HTTP 422
    - Create `backend/app/routers/ingredients.py`: `POST /ingredients/parse` (protected, Pro-only)
    - Register router in `main.py`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 10.2 Write property test for ingredient parser (Property 19)
    - **Property 19: Ingredient Parser Round-Trip** — parse → format → parse produces equivalent array
    - Create `backend/app/tests/property/test_parser_properties.py`
    - **Validates: Requirements 10.1, 10.3, 10.4, 10.5**

  - [ ]* 10.3 Write unit tests for ingredient parser
    - Test comma-separated, slash-separated, mixed, whitespace trimming, empty string 422
    - Create `backend/app/tests/unit/test_ingredient_parser.py`
    - _Requirements: 10.1–10.5_


- [x] 11. AI pattern detection
  - [x] 11.1 Implement pattern detector service
    - Create `backend/app/services/pattern_detector.py`:
      - `detect_triggers(user_id, db) -> list[{ingredient, confidence_score}]`
      - Raise HTTP 400 if user has < 3 reactions
      - Load reactions + linked product ingredients into Pandas DataFrame
      - Use `sklearn.preprocessing.MultiLabelBinarizer` to build binary ingredient matrix
      - Compute `raw_confidence = reaction_count[ingredient] / total_reactions`
      - Compute `catalog_frequency` from `is_catalog=True` products; subtract and clamp to [0.0, 1.0]
      - Sort descending by adjusted confidence; persist results to `trigger_results` table with `analyzed_at`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.2 Implement pattern detector router
    - Create `backend/app/routers/analysis.py`: `GET /analysis/triggers` (protected, Pro-only)
    - Register router in `main.py`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 11.3 Write property tests for AI service (Properties 14–16)
    - **Property 14: Trigger Analysis Output Invariant** — all confidence scores in [0.0, 1.0]; ingredients in more reactions have scores ≥ ingredients in fewer reactions (monotonicity)
    - **Property 15: Recommendation Trigger Exclusion** — every recommended product contains none of the user's trigger ingredients; list ≤ 10 items
    - **Property 16: Recommendation Response Completeness** — each recommended product has non-null name, brand, and non-empty ingredient list
    - Create `backend/app/tests/property/test_ai_properties.py`
    - **Validates: Requirements 7.1, 7.2, 7.4, 8.1, 8.3, 8.4**

  - [ ]* 11.4 Write unit tests for pattern detector
    - Test < 3 reactions returns 400, known ingredient set produces expected confidence ranking, catalog baseline subtraction
    - Create `backend/app/tests/unit/test_pattern_detector.py`
    - _Requirements: 7.1–7.5_

- [x] 12. Recommendation engine
  - [x] 12.1 Implement recommendation service and router
    - Create `backend/app/services/recommendation_service.py`: `get_recommendations(user_id, db)` — fetch latest `trigger_results` for user; if none, raise HTTP 400; query `products` where `is_catalog=True` and no ingredient overlaps with triggers; return up to 10 results
    - Create `backend/app/routers/recommendations.py`: `GET /recommendations` (protected, Pro-only)
    - Register router in `main.py`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 12.2 Write unit tests for recommendation engine
    - Test no triggers → 400, trigger exclusion correctness, max 10 results, response includes name/brand/ingredients
    - Create `backend/app/tests/unit/test_recommendations.py`
    - _Requirements: 8.1–8.4_

- [x] 13. Subscription service and tier enforcement
  - [x] 13.1 Implement subscription service
    - Create `backend/app/services/subscription_service.py`:
      - `get_subscription(user_id, db)` — returns current tier (resolving trial expiry → free), `trial_ends_at`, `subscription_ends_at`, `billing_interval`
      - `activate_trial(user)` — sets `subscription_tier=trial`, `trial_ends_at=now+14d` (called from register)
      - `get_effective_tier(user)` — returns `free` if trial expired and no active pro, else actual tier
      - `cancel_subscription(user_id, db)` — sets cancellation flag; access preserved until `subscription_ends_at`
      - `change_plan(user_id, interval, db)` — switches monthly ↔ annual
    - _Requirements: 12.3, 12.4, 12.5, 12.9, 12.11_

  - [x] 13.2 Implement subscription router
    - Create `backend/app/routers/subscription.py`: `GET /subscription`, `POST /subscription/upgrade`, `POST /subscription/cancel`, `POST /subscription/change-plan` (all protected)
    - Register router in `main.py`
    - _Requirements: 12.3, 12.9, 12.11_

  - [x] 13.3 Implement tier enforcement middleware/dependency
    - Create `require_pro` FastAPI dependency that calls `get_effective_tier`; raises HTTP 403 with "This feature requires a Pro subscription." if tier is `free`
    - Apply `require_pro` to: `/analysis/triggers`, `/recommendations`, `/ingredients/parse`, `/sync/*`
    - Create `check_product_limit` and `check_reaction_limit` guards in product/reaction services: free-tier users capped at 10 products / 20 reactions → HTTP 403
    - _Requirements: 12.1, 12.2, 12.7, 12.8_

  - [ ]* 13.4 Write property tests for subscription (Properties 21–26)
    - **Property 21: Free Tier Limit Enforcement** — free user with 10 products cannot create 11th (403); free user with 20 reactions cannot create 21st (403)
    - **Property 22: Free Tier Feature Restriction** — free user gets 403 on pattern detector, recommendations, ingredient parser, sync endpoints
    - **Property 23: Trial Activation on Registration** — new user has `tier=trial` and `trial_ends_at ≈ now+14d` (±60s)
    - **Property 24: Trial Expiry Tier Reversion** — user with past `trial_ends_at` and no pro subscription returns `tier=free`
    - **Property 25: Cancellation Access Preservation** — cancelled pro user retains `tier=pro` until `subscription_ends_at`, then `free`
    - **Property 26: Post-Cancellation Data Preservation** — after tier reverts to free, all existing products and reactions remain accessible
    - Create `backend/app/tests/property/test_subscription_properties.py`
    - **Validates: Requirements 12.1, 12.2, 12.4, 12.5, 12.7, 12.8, 12.9, 12.10**

  - [ ]* 13.5 Write unit tests for subscription service
    - Test trial activation, trial expiry reversion, cancellation flow, plan change, free tier limits
    - Create `backend/app/tests/unit/test_subscription.py`
    - _Requirements: 12.1–12.11_

- [x] 14. Checkpoint — backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Security and input validation
  - [x] 15.1 Add global input validation and security middleware
    - Register global `RequestValidationError` handler (422) and generic 500 handler in `main.py`
    - Add `max_length=10000` validators to all string fields in Pydantic schemas
    - Add HTTPS enforcement header middleware (HSTS) for production
    - Verify all resource queries filter by `user_id = current_user.id`
    - _Requirements: 9.1, 9.3, 9.4, 9.5_

  - [ ]* 15.2 Write property tests for security (Properties 17–18)
    - **Property 17: Protected Endpoint Authorization** — any protected endpoint without valid JWT returns 401
    - **Property 18: Field Length Validation** — any payload with a field > 10,000 chars returns 422
    - Create `backend/app/tests/property/test_security_properties.py`
    - **Validates: Requirements 9.1, 9.5**

- [x] 16. Payment integration
  - [x] 16.1 Implement Stripe payment service
    - Create `backend/app/services/payment_service.py`:
      - `create_stripe_intent(user_id, plan, db)` — call Stripe API to create PaymentIntent; return `client_secret`, `amount`, `currency`
      - `handle_stripe_webhook(payload, sig_header)` — verify signature with `stripe.webhook.construct_event`; on `payment_intent.succeeded` activate subscription and insert `Transaction` record with `status=succeeded`; on failure leave tier unchanged
    - _Requirements: 13.1, 13.3, 13.4, 13.5, 13.10_

  - [x] 16.2 Implement PayPal payment service
    - Add to `payment_service.py`:
      - `create_paypal_order(user_id, plan, db)` — call PayPal Orders API; return `order_id`, `approval_url`
      - `capture_paypal_order(user_id, order_id, db)` — capture order; on success activate subscription and insert `Transaction` record
      - `handle_paypal_webhook(payload, headers)` — verify and process PayPal webhook events
    - _Requirements: 13.2, 13.4, 13.5, 13.10_

  - [x] 16.3 Implement payment router
    - Create `backend/app/routers/payments.py`:
      - `POST /payments/create-intent` (Stripe, protected)
      - `POST /payments/paypal/create-order` (protected)
      - `POST /payments/paypal/capture` (protected)
      - `GET /payments/history` (protected)
      - `POST /webhooks/stripe` (public, signature-verified)
      - `POST /webhooks/paypal` (public, signature-verified)
    - Register router in `main.py`
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 13.6_

  - [ ]* 16.4 Write property tests for payments (Properties 27–30)
    - **Property 27: No Raw Payment Data in Transactions** — no transaction record contains raw card numbers, CVV, or full PayPal credentials
    - **Property 28: Payment Success Activates Subscription** — successful webhook event sets `tier=pro` and creates transaction with `status=succeeded`
    - **Property 29: Payment Failure Does Not Activate Subscription** — failed payment event leaves tier unchanged
    - **Property 30: Billing History Completeness** — billing endpoint returns current tier, next renewal date, and transactions with date/amount/payment_method
    - Create `backend/app/tests/property/test_payment_properties.py`
    - **Validates: Requirements 13.3, 13.4, 13.5, 13.6, 13.10**

  - [ ]* 16.5 Write unit tests for payment service
    - Test Stripe intent creation, webhook signature verification, PayPal order create/capture, billing history, failed payment no-op
    - Create `backend/app/tests/unit/test_payments.py`
    - _Requirements: 13.1–13.10_

  - [ ]* 16.6 Write integration tests for payment flows
    - Test full Stripe flow (create intent → mock webhook → subscription activated) with mocked Stripe responses
    - Test full PayPal flow (create order → capture → subscription activated) with mocked PayPal responses
    - Create `backend/app/tests/integration/test_payment_flow.py`
    - _Requirements: 13.1–13.5_

- [x] 17. Offline sync endpoints
  - [x] 17.1 Implement sync pull and push endpoints
    - Create `backend/app/services/sync_service.py`:
      - `pull(user_id, last_pulled_at, db)` — returns `{changes: {products: {created, updated, deleted}, reactions: {created, updated, deleted}}, timestamp}`; filters by `user_id` and `updated_at > last_pulled_at`
      - `push(user_id, changes, db)` — applies local changes using last-write-wins by `updated_at`; deletions always win
    - Create `backend/app/routers/sync.py`: `GET /sync/pull` and `POST /sync/push` (both protected, Pro-only)
    - Register router in `main.py`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 17.2 Write property test for sync conflict resolution (Property 20)
    - **Property 20: Sync Conflict Resolution** — for any two versions of the same record, sync merge always selects the version with the later `updated_at`
    - Create `backend/app/tests/property/test_sync_properties.py`
    - **Validates: Requirements 11.2**

  - [ ]* 17.3 Write integration tests for sync flow
    - Test pull returns only user's records since timestamp, push applies changes, conflict resolution selects newer record
    - Create `backend/app/tests/integration/test_sync_flow.py`
    - _Requirements: 11.1–11.4_

- [x] 18. Checkpoint — full backend complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 19. React Native project setup and navigation
  - [x] 19.1 Install dependencies and configure navigation
    - Install: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `zustand`, `@tanstack/react-query`, `@nozbe/watermelondb`, `react-native-keychain`, `react-native-vision-camera`, `react-native-gifted-charts`, `@stripe/stripe-react-native`, `@react-native-community/netinfo`
    - Create `mobile/src/navigation/RootNavigator.tsx`: `AuthStack` (Login, Register, Onboarding) and `AppTabs` (Dashboard, Products, Reactions, Insights, Profile) with auth-state-based switching
    - _Requirements: 2.4, 2.6_

  - [x] 19.2 Configure Zustand store and React Query client
    - Create `mobile/src/store/authStore.ts`: `accessToken`, `userTier`, `syncStatus` state with `setToken`, `clearToken`, `setSyncStatus` actions
    - Create `mobile/src/lib/queryClient.ts`: configure `QueryClient` with default stale time and retry logic
    - Wrap app root with `QueryClientProvider` and `StripeProvider`
    - _Requirements: 2.6, 11.3_

  - [x] 19.3 Configure WatermelonDB local schema
    - Create `mobile/src/db/schema.ts`: WatermelonDB schema for `products`, `reactions`, `reaction_products` tables with `_status`, `_changed`, `server_id` sync metadata columns
    - Create `mobile/src/db/models/`: `Product.ts`, `Reaction.ts`, `ReactionProduct.ts` WatermelonDB model classes
    - Create `mobile/src/db/index.ts`: initialize `Database` instance with SQLite adapter
    - _Requirements: 11.1_

- [x] 20. Auth screens
  - [x] 20.1 Implement LoginScreen and RegisterScreen
    - Create `mobile/src/screens/auth/LoginScreen.tsx`: email + password form, calls `POST /auth/login`, stores JWT in Keychain via `react-native-keychain`, navigates to AppTabs on success; shows error on 401
    - Create `mobile/src/screens/auth/RegisterScreen.tsx`: email + password form, calls `POST /auth/register`, stores JWT, navigates to AppTabs; shows error on 409/422
    - _Requirements: 1.1–1.5, 2.1–2.4, 2.6_

  - [x] 20.2 Implement OnboardingScreen
    - Create `mobile/src/screens/auth/OnboardingScreen.tsx`: brief feature overview with "Get Started" CTA navigating to RegisterScreen
    - _Requirements: 12.6_

- [x] 21. Dashboard screen
  - [x] 21.1 Implement DashboardScreen
    - Create `mobile/src/screens/DashboardScreen.tsx`:
      - Use React Query to fetch `GET /dashboard`
      - Render chronological timeline list (product + reaction events)
      - Render 30-day reaction frequency bar chart using `react-native-gifted-charts`
      - Render top 3 products and top 3 symptoms cards
      - Show loading spinner while fetching (Requirement 6.5)
      - Show empty state message when no data (Requirement 6.6)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 22. Product screens
  - [x] 22.1 Implement ProductListScreen and AddProductScreen
    - Create `mobile/src/screens/products/ProductListScreen.tsx`: React Query fetch of `GET /products`; list with delete swipe action; FAB to navigate to AddProductScreen; shows free-tier count badge (x/10)
    - Create `mobile/src/screens/products/AddProductScreen.tsx`:
      - Form: name, brand, ingredients (manual entry + "Parse from label" button calling `POST /ingredients/parse`)
      - Camera button using `react-native-vision-camera` to capture/select image; upload to Supabase Storage then include `image_url` in `POST /products`
      - On free-tier limit hit (403), show upgrade prompt
    - _Requirements: 4.1–4.8, 10.1, 12.6, 12.7_

  - [x] 22.2 Implement ProductDetailScreen
    - Create `mobile/src/screens/products/ProductDetailScreen.tsx`: display product name, brand, ingredient list, image; delete button with confirmation
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 23. Reaction screens
  - [x] 23.1 Implement ReactionListScreen and AddReactionScreen
    - Create `mobile/src/screens/reactions/ReactionListScreen.tsx`: React Query fetch of `GET /reactions`; ordered list showing date, severity badge, symptoms; FAB to AddReactionScreen; shows free-tier count badge (x/20)
    - Create `mobile/src/screens/reactions/AddReactionScreen.tsx`:
      - Form: date picker, severity selector (mild/moderate/severe), multi-select symptoms, product multi-select (from user's product list), optional notes textarea
      - Calls `POST /reactions`; on free-tier limit hit (403), show upgrade prompt
    - _Requirements: 5.1–5.6, 12.6, 12.8_

- [x] 24. Insights screens (Pro)
  - [x] 24.1 Implement TriggerAnalysisScreen
    - Create `mobile/src/screens/insights/TriggerAnalysisScreen.tsx`:
      - "Run Analysis" button calling `GET /analysis/triggers`
      - Display ranked list of trigger ingredients with confidence score progress bars
      - Show "insufficient data" message when < 3 reactions
      - Gate with Pro check; show upgrade prompt for free users
    - _Requirements: 7.1–7.5, 12.2, 12.6_

  - [x] 24.2 Implement RecommendationsScreen
    - Create `mobile/src/screens/insights/RecommendationsScreen.tsx`:
      - Fetch `GET /recommendations`; display product cards (name, brand, ingredient list)
      - Show "run trigger analysis first" message when no triggers exist
      - Gate with Pro check; show upgrade prompt for free users
    - _Requirements: 8.1–8.4, 12.2, 12.6_

- [x] 25. Profile and subscription screens
  - [x] 25.1 Implement ProfileScreen
    - Create `mobile/src/screens/profile/ProfileScreen.tsx`: display and edit skin type, known allergies, sensitivity level; calls `PUT /profile`; shows validation errors inline
    - _Requirements: 3.1–3.5_

  - [x] 25.2 Implement SubscriptionScreen
    - Create `mobile/src/screens/profile/SubscriptionScreen.tsx`:
      - Display current tier, trial status, renewal date from `GET /subscription`
      - "Upgrade to Pro" button (monthly/annual toggle) navigating to payment flow
      - "Cancel Subscription" button with confirmation dialog
      - "Switch Plan" toggle for monthly ↔ annual
      - Show in-app notification banner when trial expires or renewal is due within 3 days
    - _Requirements: 12.3–12.11, 13.7, 13.8, 13.9_

  - [x] 25.3 Implement BillingScreen
    - Create `mobile/src/screens/profile/BillingScreen.tsx`:
      - Fetch `GET /payments/history`; display current tier, next renewal date, transaction history list (date, amount, payment method)
      - Payment method selection: Stripe card form (`@stripe/stripe-react-native` CardField) or PayPal WebView flow
    - _Requirements: 13.1, 13.2, 13.3, 13.6_

- [x] 26. Offline sync (WatermelonDB + sync service)
  - [x] 26.1 Implement WatermelonDB sync integration
    - Create `mobile/src/services/syncService.ts`:
      - `synchronize()` — call WatermelonDB `synchronize()` with `pullChanges` (calls `GET /sync/pull`) and `pushChanges` (calls `POST /sync/push`)
      - Update Zustand `syncStatus` to `syncing` → `synced` or `error`
    - Create `mobile/src/hooks/useSyncTriggers.ts`:
      - `AppState` listener: trigger sync on foreground resume
      - `NetInfo` listener: trigger sync on connectivity restored
      - Debounced sync trigger (2s) after any local write
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 26.2 Add sync status indicator UI
    - Create `mobile/src/components/SyncStatusBanner.tsx`: persistent banner shown when `syncStatus` is `pending` or `error`; include retry button for error state
    - Mount banner in `AppTabs` layout
    - _Requirements: 11.3, 11.4_

- [x] 27. Checkpoint — all screens and offline sync complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 28. Deployment configuration
  - [x] 28.1 Create backend Dockerfile and Railway/Render config
    - Create `backend/Dockerfile`: multi-stage build — install deps, copy app, expose port 8000, `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`
    - Create `backend/railway.toml` (or `render.yaml`): service definition, env var references, pre-deploy command `alembic upgrade head`
    - _Requirements: 9.4_

  - [x] 28.2 Create GitHub Actions CI/CD pipeline
    - Create `.github/workflows/backend.yml`: jobs — `lint` (ruff/flake8), `test` (pytest with coverage ≥ 80%), `build` (docker build), `deploy` (push to Railway/Render on merge to `main`)
    - _Requirements: 9.4_

  - [x] 28.3 Configure EAS Build for React Native
    - Create `mobile/eas.json`: `development`, `preview`, and `production` build profiles for iOS and Android
    - Create `mobile/app.json`: app name, bundle ID (`com.dermatrace.app`), version, permissions (camera, network)
    - Document EAS Submit commands for App Store and Google Play in `mobile/README.md`
    - _Requirements: 9.4_

- [x] 29. Final checkpoint — full system wired and tested
  - Ensure all tests pass (backend unit + property + integration, mobile Jest), ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `hypothesis` (backend) with `@settings(max_examples=100)`; each test includes the comment `# Feature: dermatrace, Property N: <text>`
- Mobile logic tests use `fast-check` within Jest where applicable
- All 30 correctness properties are covered by property-based test sub-tasks (Properties 1–5 in task 4.2, 6–7 in 5.2, 8–10 in 6.3, 11–12 in 7.2, 13 in 9.2, 14–16 in 11.3, 17–18 in 15.2, 19 in 10.2, 20 in 17.2, 21–26 in 13.4, 27–30 in 16.4)
- Checkpoints at tasks 8, 14, 18, 27, and 29 ensure incremental validation throughout
