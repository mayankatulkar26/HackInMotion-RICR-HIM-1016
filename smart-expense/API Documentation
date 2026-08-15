# Wealth Sight — API Documentation

## 📡 API & Server Actions

Wealth Sight is built with **Next.js 15** and uses a combination of:

* Next.js Server Actions
* External AI APIs
* Brevo Email API
* MongoDB/Mongoose
* NextAuth authentication

Most application functionality is handled securely on the server through the `src/actions/` directory rather than exposing traditional public REST endpoints.

---

# 🏗️ API Architecture

```text
Frontend
   │
   ▼
Next.js Server Actions
   │
   ├── Authentication
   ├── Transactions
   ├── Dashboard
   ├── Budgets
   ├── AI Chat
   ├── Financial Analysis
   └── PDF Processing
   │
   ▼
Business Logic
   │
   ├── MongoDB / Mongoose
   ├── Gemini
   ├── Groq
   └── Brevo
```

---

# 📁 Server Action Modules

The main backend action modules are:

```text
src/actions/
│
├── auth.ts
├── transactions.ts
├── dashboard.ts
├── budgets.ts
├── chat.ts
├── analysis.ts
└── pdf.ts
```

These modules contain the server-side operations used by the web application.

---

# 🔐 1. Authentication API

**File:**

```text
src/actions/auth.ts
```

Authentication includes:

* Signup
* Login
* OTP signup verification
* Password reset
* OTP password reset verification
* Logout

The authentication layer uses **NextAuth**, **MongoDB**, **bcryptjs**, and the application's OTP email service.

---

## Signup

### Server Action

```text
signupAction()
```

### Input

```text
name
email
password
```

### Validation

```text
Name:
- Required
- Maximum 80 characters

Email:
- Must be valid

Password:
- Minimum 6 characters
```

### Process

```text
Signup Request
      ↓
Validate Input
      ↓
Normalize Email
      ↓
Check Existing User
      ↓
Hash Password
      ↓
Create User
      ↓
Sign In
```

---

# 🔐 2. OTP Signup

### Server Action

```text
signupWithOTPAction()
```

### Input

```text
name
email
password
```

### Process

```text
User Signup
     ↓
Validate Data
     ↓
Generate 6-digit OTP
     ↓
Set 10-minute Expiry
     ↓
Send OTP through Brevo
     ↓
Store OTP in MongoDB
     ↓
User Enters OTP
     ↓
verifyOTPAction()
     ↓
Email Verified
```

The current repository uses Brevo's HTTP API for OTP delivery.

---

# 🔢 3. OTP Verification

### Server Action

```text
verifyOTPAction()
```

### Input

```text
email
otp
```

### Validation

The OTP must:

* Contain exactly 6 digits
* Match the stored OTP
* Not be expired

### Success

```text
isEmailVerified = true
```

The OTP and expiry are then cleared and the user is signed in.

---

# 🔑 4. Login

### Server Action

```text
loginAction()
```

### Input

```text
email
password
```

### Process

```text
Email + Password
       ↓
Validate
       ↓
NextAuth Credentials
       ↓
Authenticate User
       ↓
Create Session
       ↓
Dashboard
```

Invalid credentials return an authentication error.

---

# 🔄 5. Password Reset API

Authentication also provides password recovery through OTP.

### Request Reset

```text
requestPasswordResetAction()
```

### Input

```text
email
```

### Process

```text
Email
 ↓
Find User
 ↓
Generate OTP
 ↓
10-minute Expiry
 ↓
Brevo Email
 ↓
Store OTP
```

---

## Verify Password Reset OTP

### Server Action

```text
verifyPasswordResetOTPAction()
```

### Input

```text
email
otp
```

The server checks the user's OTP and expiration time.

---

## Reset Password

### Server Action

```text
resetPasswordAction()
```

### Input

```text
email
otp
newPassword
```

### Process

```text
Verify OTP
    ↓
Hash New Password
    ↓
Update User
    ↓
Clear OTP
```

Passwords are hashed using `bcryptjs`.

---

# 💳 6. Transaction API

**File:**

```text
src/actions/transactions.ts
```

The transaction action layer handles the application's financial transaction operations.

Main functionality includes:

* Creating transactions
* Updating transactions
* Deleting transactions
* Reading transactions
* Filtering transactions
* Transaction categorization
* Importing transaction data

### Typical Transaction Data

```json
{
  "date": "2026-08-15",
  "description": "Amazon",
  "amount": 1499,
  "type": "expense",
  "category": "Shopping"
}
```

---

# 📂 7. CSV / Excel Transaction Import

Transaction data can be imported from external files.

Supported formats include:

```text
CSV
XLSX
```

Processing is handled on the server and converted into application transaction records.

The project uses:

* PapaParse for CSV
* XLSX for Excel files

---

# 📄 8. PDF Statement Processing

**File:**

```text
src/actions/pdf.ts
```

The application includes server-side PDF processing for financial statements.

### Flow

```text
PDF Statement
      ↓
Upload
      ↓
Server Processing
      ↓
Extract Transaction Data
      ↓
Normalize Transactions
      ↓
Store in MongoDB
```

---

# 📊 9. Dashboard API

**File:**

```text
src/actions/dashboard.ts
```

The dashboard action provides aggregated financial information.

The dashboard can provide information such as:

* Income
* Expenses
* Balance
* Spending summaries
* Recent transactions
* Category information
* Period-based financial data

### Dashboard Flow

```text
User
 ↓
Dashboard Request
 ↓
MongoDB
 ↓
Aggregate Financial Data
 ↓
Return Dashboard Data
 ↓
Charts + Cards + Tables
```

---

# 💰 10. Budget API

**File:**

```text
src/actions/budgets.ts
```

The budget server actions handle budget and savings-related functionality.

Main functionality includes:

* Creating budgets
* Updating budgets
* Deleting budgets
* Reading budgets
* Tracking spending against budgets
* Savings goal management

### Budget Example

```json
{
  "category": "Food",
  "amount": 5000,
  "period": "monthly"
}
```

---

# 🎯 11. Savings Goals

Savings goals allow users to define financial targets.

Example:

```json
{
  "name": "New Laptop",
  "targetAmount": 70000,
  "currentAmount": 25000
}
```

The application can calculate progress toward the target.

```text
Current Savings
       ÷
Target Amount
       ×
100
       =
Progress %
```

---

# 💬 12. AI Chat API

**File:**

```text
src/actions/chat.ts
```

The AI chat functionality is handled through server-side actions.

### Input

Typical chat input contains:

```text
User message
Financial context
Conversation history
```

### Flow

```text
User Question
      ↓
Chat Server Action
      ↓
Financial Context
      ↓
AI Provider
      ↓
AI Response
      ↓
User
```

The project also includes **chat history**, allowing previous conversations to be retained.

---

# 🤖 13. Google Gemini API

Wealth Sight uses Google Gemini for AI-powered functionality.

The Gemini integration is located in:

```text
src/lib/gemini.ts
```

### Environment Variable

```env
GEMINI_API_KEY=your_gemini_api_key
```

### Main Uses

Gemini can support:

* Transaction categorization
* Financial analysis
* Financial recommendations
* AI finance assistant
* Natural-language financial questions

---

# 🔁 14. Groq AI API

Groq is used as an AI provider/fallback within the application's AI system.

### Environment Variable

```env
GROQ_API_KEY=your_groq_api_key
```

The application is designed to use a fallback strategy when the preferred AI provider encounters errors or availability/quota problems.

### AI Architecture

```text
                  AI Request
                      │
                      ▼
                  Gemini
                      │
                ┌─────┴─────┐
                │            │
             Success       Error
                │            │
                ▼            ▼
             Result         Groq
                              │
                              ▼
                           Result
```

---

# 📧 15. Brevo Email API

The current OTP email implementation uses **Brevo's HTTP API**.

### Endpoint

```text
POST https://api.brevo.com/v3/smtp/email
```

### Authentication

```http
api-key: YOUR_BREVO_API_KEY
```

### Request Structure

```json
{
  "sender": {
    "name": "Wealth Sight",
    "email": "verified@example.com"
  },
  "to": [
    {
      "email": "user@example.com",
      "name": "User"
    }
  ],
  "subject": "Your Wealth Sight OTP Verification Code",
  "htmlContent": "OTP email HTML"
}
```

### Environment Variables

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM=Wealth Sight <your_verified_email>
```

---

# 🗄️ 16. MongoDB Database

Wealth Sight uses **MongoDB with Mongoose**.

### Environment Variable

```env
DATABASE_URL=your_mongodb_connection_string
```

A legacy-compatible variable is also present:

```env
MONGODB_URI=your_mongodb_connection_string
```

The database layer is located under:

```text
src/db/
```

The repository includes database connection logic and models.

---

# 📦 17. Main Data Models

The application's database layer contains models for application data such as:

```text
User
Transaction
Budget
Savings Goal
Chat / Chat History
```

The exact model structure is maintained in:

```text
src/db/models.ts
```

---

# 🧠 18. Financial Analysis API

**File:**

```text
src/actions/analysis.ts
```

The analysis layer was added to perform deeper financial calculations and analysis.

It supports functionality such as:

* Spending analysis
* Financial health calculations
* Category analysis
* Financial recommendations
* Benchmark-related analysis

### Analysis Flow

```text
Transactions
     ↓
Financial Calculations
     ↓
Category Analysis
     ↓
Benchmarks
     ↓
Financial Health
     ↓
Recommendations
```

---

# 📊 19. Benchmark Comparison

Wealth Sight includes financial benchmark comparison.

The benchmark logic is maintained in the application's benchmark utilities and displayed through:

```text
src/components/insights/benchmark-comparison.tsx
```

### Purpose

Benchmark comparison helps users understand whether their spending is:

```text
Below Benchmark
       ↓
Healthy Range
       ↓
Above Benchmark
```

This gives users additional context instead of only showing their raw spending numbers.

---

# 🔒 20. Authentication & Authorization

Authentication is handled through:

```text
NextAuth
```

The application uses protected dashboard routes.

The general flow is:

```text
User
 ↓
Authentication
 ↓
Session
 ↓
Protected Route
 ↓
Server Action
 ↓
Database
```

Sensitive operations are performed on the server rather than exposing database credentials or API keys to the browser.

---

# 🌐 21. External API Summary

| API / Service | Purpose                           | Authentication     |
| ------------- | --------------------------------- | ------------------ |
| Google Gemini | AI analysis & categorization      | `GEMINI_API_KEY`   |
| Groq          | AI fallback                       | `GROQ_API_KEY`     |
| Brevo         | OTP email delivery                | `BREVO_API_KEY`    |
| MongoDB       | Application database              | Connection string  |
| NextAuth      | Authentication/session management | Auth configuration |

---

# 🔐 22. Environment Variables

The main external-service configuration includes:

```env
# Database
DATABASE_URL=
MONGODB_URI=

# Authentication
AUTH_SECRET=
AUTH_URL=

NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Email
BREVO_API_KEY=
BREVO_FROM=

# AI
GEMINI_API_KEY=
GROQ_API_KEY=
```

The repository's environment template contains the database, authentication, AI and email configuration used by the application.

---

# 🔄 Complete API Architecture

```text
                         Wealth Sight
                              │
                              ▼
                       Next.js Frontend
                              │
                              ▼
                    Server Actions / Backend
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Authentication       Transactions            Dashboard
        │                     │                     │
        ▼                     ▼                     ▼
    NextAuth              MongoDB              MongoDB
        │
        ▼
      OTP
        │
        ▼
     Brevo API


        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
       Chat                Analysis                PDF
        │                     │                     │
        ▼                     ▼                     ▼
     Gemini                Gemini/Groq          Statement
        │                     │                     │
        ▼                     ▼                     ▼
      Groq               Financial Data        Transactions
```

---

# 🧪 API Error Handling

The application validates inputs before performing server operations.

Typical errors include:

```text
Invalid email
Invalid password
User already exists
User not found
Invalid OTP
Expired OTP
Failed to send OTP
Invalid transaction data
Authentication failure
AI provider failure
Database failure
```

AI and email integrations also return provider-specific errors where appropriate.

---

# 🔐 Security Practices

Wealth Sight follows several server-side security practices:

* API keys stored in environment variables
* Database operations performed server-side
* Password hashing with bcrypt
* OTP expiration
* Input validation with Zod
* Protected dashboard routes
* Authentication through NextAuth
* Security-focused ESLint plugins
* Next.js security headers
* No API secrets exposed to the client

---

# 📌 Important Architecture Note

Wealth Sight should **not be described as a REST API-only application**.

The backend primarily uses:

```text
Next.js Server Actions
```

instead of exposing every operation as:

```text
GET /api/...
POST /api/...
PUT /api/...
DELETE /api/...
```

External APIs are used where required:

```text
Gemini → AI
Groq → AI fallback
Brevo → Email / OTP
MongoDB → Database
```

This architecture keeps database operations, authentication logic and API keys on the server.

---

# 🚀 API Request Flow Example

For an AI financial question:

```text
User:
"Where am I spending the most?"
          ↓
Frontend
          ↓
Chat Server Action
          ↓
Fetch User Financial Data
          ↓
Build AI Context
          ↓
Gemini
          ↓
If Gemini fails → Groq
          ↓
AI Response
          ↓
Frontend
          ↓
User sees financial explanation
```

For signup:

```text
Signup Form
    ↓
signupWithOTPAction()
    ↓
Validate Input
    ↓
Generate OTP
    ↓
Brevo API
    ↓
Store OTP in MongoDB
    ↓
User enters OTP
    ↓
verifyOTPAction()
    ↓
Verify OTP
    ↓
Mark Email Verified
    ↓
NextAuth Sign In
```

---

# 📚 API Reference Summary

```text
AUTH
├── signupAction()
├── signupWithOTPAction()
├── verifyOTPAction()
├── loginAction()
├── requestPasswordResetAction()
├── verifyPasswordResetOTPAction()
├── resetPasswordAction()
└── signOutAction()

TRANSACTIONS
└── Transaction server actions

DASHBOARD
└── Dashboard server actions

BUDGETS
└── Budget & savings server actions

CHAT
└── AI chat + chat history server actions

ANALYSIS
└── Financial analysis server actions

PDF
└── Financial statement processing

EXTERNAL SERVICES
├── Google Gemini API
├── Groq API
├── Brevo Email API
└── MongoDB
```

---

## 🔗 Project Repository

GitHub:

```text
https://github.com/mayankatulkar26/HackInMotion-RICR-HIM-1016
```

Project:

```text
smart-expense
```

Live application:

```text
https://hackinmotion-ricr-him-1016.onrender.com/
```
