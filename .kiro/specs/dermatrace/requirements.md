# Requirements Document

## Introduction

DermaTrace is a full-stack, cross-platform mobile SaaS application for personal cosmetic allergy and skin reaction tracking. It enables users to log skincare/cosmetic products, record skin reactions, identify allergen patterns through data analysis, and receive safer product recommendations. The primary client is a cross-platform mobile app (React Native or Flutter) targeting Android and iOS. The backend is built with FastAPI and Supabase (PostgreSQL), with a Python-based AI pattern detection layer.

DermaTrace uses a freemium pricing model. A Free Tier provides core tracking functionality at no cost, while a Pro Tier unlocks AI-powered insights, unlimited logging, and offline sync for a fair monthly or annual subscription fee. Payments are processed securely via PayPal and debit card through an integrated Payment_Service.

## Glossary

- **System**: The DermaTrace application as a whole
- **Mobile_App**: The cross-platform mobile client application running on Android and iOS
- **Auth_Service**: The component responsible for user registration, login, and JWT token management
- **User**: A registered individual using DermaTrace to track their skin health
- **Profile**: A User's stored personal skin attributes (skin type, known allergies, sensitivity level)
- **Product**: A cosmetic or skincare item logged by a User, including name, brand, and ingredients
- **Reaction**: A skin event logged by a User, linked to one or more Products, with severity and symptoms
- **Ingredient**: A single chemical or natural component within a Product's ingredient list
- **Trigger**: An Ingredient identified by the Pattern_Detector as likely causing a Reaction
- **Pattern_Detector**: The AI/analysis component that correlates Ingredients with Reactions
- **Recommendation_Engine**: The component that suggests Products free of a User's identified Triggers
- **Dashboard**: The mobile screen presenting a User's product usage timeline, reaction history, and insights
- **JWT**: JSON Web Token used for stateless authentication
- **Severity**: A classification of a Reaction's intensity — one of: mild, moderate, or severe
- **Symptom**: A discrete observable skin effect (e.g., rash, itching, acne, swelling, redness)
- **Camera_Service**: The mobile device component used to capture or select product images
- **Subscription**: A recurring billing arrangement granting a User access to a specific feature tier (Free_Tier or Pro_Tier)
- **Payment_Service**: The external payment processor (PayPal or Stripe) used to handle debit card and PayPal transactions
- **Free_Tier**: The no-cost subscription level providing basic product logging (up to 10 Products), reaction tracking (up to 20 Reactions), and a basic Dashboard without AI insights
- **Pro_Tier**: The paid subscription level ($4.99/month or $39.99/year) providing unlimited Products and Reactions, AI pattern detection, the Recommendation_Engine, the Ingredient_Parser, and offline sync
- **Billing_Period**: The active subscription interval (monthly or annual) during which a User retains access to their subscribed tier

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to create an account from the mobile app, so that I can securely store and access my personal skin tracking data.

#### Acceptance Criteria

1. WHEN a registration request is submitted with a valid email and a password of at least 8 characters, THE Auth_Service SHALL create a new User record with the password stored as a bcrypt hash.
2. WHEN a registration request is submitted with an email that already exists in the database, THE Auth_Service SHALL return an error response with HTTP status 409 and a message indicating the email is already registered.
3. WHEN a registration request is submitted with a missing or malformed email, THE Auth_Service SHALL return an error response with HTTP status 422 and a descriptive validation message.
4. WHEN a registration request is submitted with a password shorter than 8 characters, THE Auth_Service SHALL return an error response with HTTP status 422 and a message specifying the minimum password length.
5. WHEN a User is successfully registered, THE Auth_Service SHALL return a JWT access token valid for 24 hours.

---

### Requirement 2: User Login and Logout

**User Story:** As a registered User, I want to log in and log out from the mobile app, so that I can securely access and end my session.

#### Acceptance Criteria

1. WHEN a login request is submitted with a valid email and correct password, THE Auth_Service SHALL return a JWT access token valid for 24 hours.
2. WHEN a login request is submitted with a valid email and an incorrect password, THE Auth_Service SHALL return an error response with HTTP status 401.
3. WHEN a login request is submitted with an email that does not exist, THE Auth_Service SHALL return an error response with HTTP status 401.
4. WHEN a logout action is performed, THE System SHALL invalidate the current session token on the Mobile_App and navigate the User to the login screen.
5. WHILE a JWT token has expired, THE Auth_Service SHALL reject requests to protected endpoints with HTTP status 401.
6. THE Mobile_App SHALL securely persist the JWT token using the device's secure storage (Keychain on iOS, Keystore on Android) so the User remains logged in across app restarts.

---

### Requirement 3: User Profile Management

**User Story:** As a registered User, I want to view and update my skin profile from the mobile app, so that the system can tailor insights and recommendations to my specific skin characteristics.

#### Acceptance Criteria

1. WHEN an authenticated User opens the profile screen, THE System SHALL display the User's email, skin type, known allergies, and sensitivity level.
2. WHEN an authenticated User submits a profile update with valid skin type, known allergies, and sensitivity level, THE System SHALL persist the updated Profile and return the updated data.
3. WHEN a profile update request is submitted with an invalid skin type value, THE System SHALL return an error response with HTTP status 422 and a message listing the accepted skin type values.
4. THE System SHALL accept the following skin type values: normal, dry, oily, combination, sensitive.
5. THE System SHALL accept the following sensitivity level values: low, medium, high.

---

### Requirement 4: Product Logging

**User Story:** As a User, I want to log cosmetic and skincare products from my mobile device, so that I can track what I apply to my skin over time.

#### Acceptance Criteria

1. WHEN an authenticated User submits a new product with a name, brand, and ingredient list, THE System SHALL create a Product record associated with that User and return the created Product with HTTP status 201.
2. WHEN an authenticated User submits a new product with a missing name field, THE System SHALL return an error response with HTTP status 422.
3. WHEN an authenticated User opens the product list screen, THE System SHALL display all Products associated with that User.
4. WHEN an authenticated User taps to delete a Product by its ID, THE System SHALL delete the Product and return HTTP status 204.
5. WHEN an authenticated User requests deletion of a Product ID that does not belong to that User, THE System SHALL return an error response with HTTP status 403.
6. WHERE a product image is provided, THE System SHALL store the image and associate it with the Product record.
7. THE System SHALL store the ingredient list for each Product as a structured JSON array of ingredient name strings.
8. WHERE the device camera is available, THE Mobile_App SHALL allow the User to capture or select a product image using the Camera_Service.

---

### Requirement 5: Reaction Tracking

**User Story:** As a User, I want to log skin reactions and link them to products I used from my mobile device, so that I can build a history of how my skin responds to specific products.

#### Acceptance Criteria

1. WHEN an authenticated User submits a reaction with a date, severity, at least one symptom, and at least one linked Product ID, THE System SHALL create a Reaction record and return it with HTTP status 201.
2. WHEN a reaction submission includes a Product ID that does not belong to the authenticated User, THE System SHALL return an error response with HTTP status 403.
3. WHEN a reaction submission includes a severity value outside of mild, moderate, or severe, THE System SHALL return an error response with HTTP status 422.
4. WHEN an authenticated User opens the reaction history screen, THE System SHALL display all Reactions associated with that User, ordered by date descending.
5. THE System SHALL accept the following symptom values: rash, itching, acne, swelling, redness, dryness, burning, hives.
6. WHEN a reaction submission includes an optional notes field, THE System SHALL store the notes text alongside the Reaction record.

---

### Requirement 6: Dashboard and Insights

**User Story:** As a User, I want a visual dashboard screen showing my product usage and reaction history, so that I can quickly understand patterns in my skin health.

#### Acceptance Criteria

1. WHEN an authenticated User opens the Dashboard screen, THE System SHALL display a chronological timeline of Product usage events and Reaction events.
2. WHEN an authenticated User opens the Dashboard screen, THE System SHALL display a chart showing reaction frequency over the past 30 days.
3. WHEN an authenticated User opens the Dashboard screen, THE System SHALL display the top 3 Products associated with the highest number of Reactions for that User.
4. WHEN an authenticated User opens the Dashboard screen, THE System SHALL display the top 3 most frequently logged Symptoms for that User.
5. WHILE the Dashboard data is loading, THE Mobile_App SHALL display a loading indicator to the User.
6. IF the authenticated User has no logged Products or Reactions, THEN THE Mobile_App SHALL display an empty state message prompting the User to log their first product.

---

### Requirement 7: AI Pattern Detection

**User Story:** As a User, I want the system to analyze my reaction history and identify likely trigger ingredients, so that I can make informed decisions about which ingredients to avoid.

#### Acceptance Criteria

1. WHEN an authenticated User requests trigger analysis, THE Pattern_Detector SHALL analyze the User's Reactions and associated Product ingredients and return a list of candidate Trigger ingredients.
2. WHEN the Pattern_Detector returns trigger results, THE System SHALL include a confidence score between 0.0 and 1.0 for each candidate Trigger ingredient.
3. WHEN an authenticated User has fewer than 3 logged Reactions, THE Pattern_Detector SHALL return a response indicating insufficient data for reliable analysis.
4. THE Pattern_Detector SHALL use co-occurrence frequency of Ingredients across Products linked to Reactions as the basis for confidence scoring.
5. WHEN the Pattern_Detector produces results, THE System SHALL return results within 5 seconds for a User with up to 500 Reaction records.

---

### Requirement 8: Recommendation Engine

**User Story:** As a User, I want to receive product recommendations that avoid my identified trigger ingredients, so that I can safely explore new skincare options.

#### Acceptance Criteria

1. WHEN an authenticated User requests recommendations, THE Recommendation_Engine SHALL return a list of Products from the system catalog that do not contain any of the User's identified Trigger ingredients.
2. WHEN an authenticated User has no identified Triggers, THE Recommendation_Engine SHALL return a response indicating that trigger analysis must be completed before recommendations can be generated.
3. WHEN the Recommendation_Engine returns results, THE System SHALL include the product name, brand, and ingredient list for each recommended Product.
4. THE Recommendation_Engine SHALL return a maximum of 10 recommended Products per request.

---

### Requirement 9: API Security and Input Validation

**User Story:** As a system operator, I want all API endpoints to enforce authentication and validate inputs, so that user data is protected and the system remains stable.

#### Acceptance Criteria

1. WHEN a request is made to any protected endpoint without a valid JWT token, THE Auth_Service SHALL return an error response with HTTP status 401.
2. THE System SHALL hash all passwords using bcrypt with a minimum cost factor of 12 before storing them.
3. THE System SHALL validate all incoming request payloads against defined schemas and reject malformed requests with HTTP status 422.
4. THE System SHALL enforce HTTPS for all client-server communication in production deployments.
5. WHEN a request payload contains a field exceeding 10,000 characters, THE System SHALL return an error response with HTTP status 422.

---

### Requirement 10: Ingredient Parser

**User Story:** As a User, I want to paste a raw ingredient list string from a product label into the mobile app, so that the system can parse it into structured data without manual entry of each ingredient.

#### Acceptance Criteria

1. WHEN a raw ingredient string is submitted to the ingredient parser, THE Ingredient_Parser SHALL parse it into an ordered JSON array of individual ingredient name strings.
2. WHEN the Ingredient_Parser receives an empty string, THE Ingredient_Parser SHALL return an error response with HTTP status 422 and a message indicating the input is empty.
3. THE Ingredient_Parser SHALL handle comma-separated and forward-slash-separated ingredient formats.
4. THE Ingredient_Parser SHALL trim leading and trailing whitespace from each parsed ingredient name.
5. FOR ALL valid ingredient strings, parsing then formatting then parsing SHALL produce an equivalent ordered ingredient array (round-trip property).

---

### Requirement 11: Offline Support

**User Story:** As a User, I want to log products and reactions while offline, so that I can continue tracking my skin health without an active internet connection.

#### Acceptance Criteria

1. WHILE the device has no network connectivity, THE Mobile_App SHALL allow the User to create Product and Reaction records and store them locally on the device.
2. WHEN network connectivity is restored, THE Mobile_App SHALL automatically sync locally stored records to the backend and resolve any conflicts by preserving the most recent record by timestamp.
3. WHILE unsynced local records exist, THE Mobile_App SHALL display a sync status indicator to the User.
4. IF a sync operation fails, THEN THE Mobile_App SHALL retain the local records and retry the sync on the next available network connection.

---

### Requirement 12: Subscription and Pricing

**User Story:** As a User, I want a clear and fair pricing model with a free tier and an affordable pro upgrade, so that I can choose the level of access that fits my needs without feeling locked out of core functionality.

#### Acceptance Criteria

1. THE System SHALL provide a Free_Tier that allows a User to log up to 10 Products and up to 20 Reactions at no cost, with access to the basic Dashboard.
2. WHILE a User is on the Free_Tier, THE System SHALL restrict access to the Pattern_Detector, Recommendation_Engine, Ingredient_Parser, and offline sync features.
3. THE System SHALL provide a Pro_Tier available at $4.99 per month or $39.99 per year, granting unlimited Product and Reaction logging, AI pattern detection, the Recommendation_Engine, the Ingredient_Parser, and offline sync.
4. WHEN a new User completes registration, THE System SHALL automatically activate a 14-day free trial of the Pro_Tier for that User without requiring payment details.
5. WHEN a User's 14-day free trial expires and no active Pro_Tier Subscription exists, THE System SHALL revert the User to the Free_Tier and notify the User via an in-app message.
6. WHEN a User on the Free_Tier attempts to access a Pro_Tier feature, THE Mobile_App SHALL display an upgrade prompt describing the Pro_Tier benefits and pricing.
7. WHEN a User on the Free_Tier attempts to log an 11th Product, THE System SHALL return an error response with HTTP status 403 and a message indicating the Free_Tier product limit has been reached.
8. WHEN a User on the Free_Tier attempts to log a 21st Reaction, THE System SHALL return an error response with HTTP status 403 and a message indicating the Free_Tier reaction limit has been reached.
9. WHEN a Pro_Tier User cancels their Subscription, THE System SHALL retain the User's Pro_Tier access until the end of the current Billing_Period, then revert the User to the Free_Tier.
10. WHEN a User's Subscription is reverted to the Free_Tier after cancellation, THE System SHALL preserve all existing Product and Reaction records but restrict creation of new records beyond the Free_Tier limits.
11. THE System SHALL allow a User to upgrade from Free_Tier to Pro_Tier, downgrade from Pro_Tier to Free_Tier, or switch between monthly and annual billing from within the Mobile_App.

---

### Requirement 13: Payment Processing

**User Story:** As a User, I want to pay for a Pro subscription using PayPal or a debit card, so that I can use a payment method I already have without needing a credit card.

#### Acceptance Criteria

1. WHEN a User initiates a Pro_Tier Subscription purchase, THE Payment_Service SHALL present the User with the option to pay via PayPal or debit card.
2. WHEN a User selects PayPal as the payment method, THE Payment_Service SHALL redirect the User through the PayPal authorization flow and return a confirmation upon successful authorization.
3. WHEN a User selects debit card as the payment method, THE Payment_Service SHALL collect the card details through a PCI-DSS compliant payment form and process the charge without storing raw card data on DermaTrace servers.
4. WHEN a payment is successfully processed, THE System SHALL activate or renew the User's Pro_Tier Subscription and record the transaction in the User's billing history.
5. IF a payment attempt fails, THEN THE Payment_Service SHALL return a descriptive error message to the Mobile_App and THE System SHALL NOT activate or renew the Subscription.
6. WHEN an authenticated User opens the billing screen, THE System SHALL display the User's current Subscription tier, next renewal date, and a list of past transactions including date, amount, and payment method.
7. WHEN a Subscription renewal is due within 3 days, THE System SHALL send the User an in-app notification informing them of the upcoming charge.
8. IF a recurring payment fails on the renewal date, THEN THE System SHALL notify the User via in-app message and allow a 3-day grace period before reverting the User to the Free_Tier.
9. WHEN a User cancels their Subscription, THE System SHALL confirm the cancellation, display the date on which Pro_Tier access will end, and cease all future recurring charges.
10. THE System SHALL never store raw debit card numbers, CVV codes, or full PayPal credentials on DermaTrace servers or in DermaTrace databases.
