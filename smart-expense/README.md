# Wealth Sight 💰

### AI-Powered Personal Finance & Financial Health Dashboard

Wealth Sight is an AI-powered personal finance web application built for the **Hack In Motion – RICR FinTech Challenge**.

The goal is simple: instead of manually checking transactions and trying to understand where money goes, Wealth Sight turns financial data into clear insights, spending analysis, budgets, savings goals and personalized recommendations.

---

## 🚀 What Wealth Sight Does

Wealth Sight helps users:

* 📊 Understand their overall financial health
* 💳 Track income and expenses
* 📁 Import transactions from CSV, Excel and financial statements
* 🏷️ Automatically categorize transactions
* 💰 Manage budgets
* 🎯 Create savings goals
* 📈 Analyze spending patterns
* 🤖 Generate AI-powered financial insights
* 💬 Chat with an AI finance assistant
* 🧾 Track upcoming bills
* 📊 Compare financial behavior with benchmark data
* 🔐 Secure accounts with authentication and OTP verification

---

# ✨ Main Features

## 🔐 Authentication & OTP Verification

Users can securely create accounts and access their dashboard.

Features include:

* Login and signup
* Password hashing
* NextAuth authentication
* Protected dashboard routes
* OTP-based signup verification
* OTP-based password recovery
* Server-side validation

### 📧 Email Verification

The email system was recently updated for better deployment compatibility.

The latest implementation uses the **Brevo HTTP API** instead of SMTP/Nodemailer for OTP delivery.

This avoids common SMTP connection problems on cloud/serverless deployments.

Current configuration uses:

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM=Wealth Sight <your-verified-email@example.com>
```

---

# 📊 Financial Dashboard

The dashboard provides a complete overview of the user's financial activity.

It includes:

* Total income
* Total expenses
* Current balance
* Spending summary
* Recent transactions
* Financial health information
* Month-based filtering
* Spending visualizations
* Upcoming bills
* Quick financial indicators

The dashboard dynamically updates according to the selected period.

---

# 💳 Transaction Management

Users can manage financial transactions from a dedicated transactions section.

Supported functionality includes:

* Add transactions manually
* Edit transaction information
* View transactions
* Search transactions
* Filter transactions
* Categorize transactions
* Track income
* Track expenses
* View transaction statistics

The transaction interface has also been improved for better usability and responsive layouts.

---

# 📂 Statement & File Import

Users can import existing financial data instead of entering every transaction manually.

Supported formats include:

* CSV
* Excel / XLSX
* Financial statement data
* PDF statement processing

The transaction import system processes the uploaded data and converts it into structured transactions.

---

# 🤖 AI Transaction Categorization

Wealth Sight uses a hybrid categorization system.

```text
Transaction
     ↓
Rule / Merchant Detection
     ↓
Known Category?
   ↙        ↘
 Yes         No
 ↓            ↓
Category    Gemini AI
              ↓
        If Gemini fails
              ↓
         Groq Fallback
              ↓
            Result
```

The system first tries to identify common merchants and transaction patterns.

For unknown transactions, AI classification can be used.

### Supported AI Providers

* Google Gemini
* Groq

Gemini is preferred while Groq can be used as an automatic fallback.

---

# 💡 AI Financial Insights

Wealth Sight analyzes transaction data to generate personalized financial insights.

Examples include:

* High spending categories
* Spending patterns
* Unusual spending
* Financial behavior analysis
* Personalized recommendations
* Savings suggestions
* Expense reduction opportunities

The objective is to transform raw transaction data into understandable financial information.

---

# 💬 AI Finance Assistant

The application includes an AI-powered finance assistant.

Users can ask questions about their financial activity, such as:

> Where am I spending the most?

> How can I reduce my monthly expenses?

> How much should I save?

> Which category is increasing my expenses?

The assistant can use the user's financial context to provide relevant answers.

### 🆕 Chat History

Recent development added **AI chat history**.

Users can now maintain previous conversations instead of starting from an empty chat every time.

---

# 💰 Budget Management

Users can create spending budgets for different categories.

The application provides visual progress indicators to help users understand:

* Planned spending
* Current spending
* Remaining budget
* Budget utilization

This makes it easier to identify categories where spending is getting too high.

---

# 🎯 Savings Goals

Users can create personalized savings goals.

Examples:

* Laptop
* Smartphone
* Emergency fund
* Travel
* Education
* Personal purchases

Each goal can be tracked over time.

The savings simulator also helps users understand how changing their savings behavior can affect goal progress.

---

# 🧾 Upcoming Bills

A new **Upcoming Bills** component has been added to the dashboard.

It helps users keep track of expected payments and upcoming financial obligations.

This gives users a better view of future cash requirements instead of only looking at historical transactions.

---

# 📊 Financial Benchmark Comparison

Wealth Sight now includes a **Benchmark Comparison** feature.

Users can compare their spending behavior against benchmark financial data.

The benchmark system helps answer questions such as:

* Is my spending unusually high?
* Which category is consuming more than expected?
* How does my spending compare with a reference level?
* Where should I improve?

The application includes dedicated benchmark logic and a visual comparison interface.

---

# 📈 Financial Analysis

The application now contains a dedicated financial analysis system for calculating and processing financial information.

Analysis can include:

* Income and expense trends
* Category-level spending
* Spending distribution
* Financial health indicators
* Benchmark comparisons
* Savings analysis
* Financial recommendations

---

# 📱 Responsive & Mobile UI

The UI has been improved for mobile devices.

Recent changes include:

* Mobile-friendly layouts
* Responsive dashboard components
* Improved transaction pages
* Better top navigation behavior
* Improved spacing on smaller screens
* Responsive insights and analytics sections

The application is designed to work across desktop, tablet and mobile screen sizes.

---

# 🔒 Security Improvements

Recent development also added security-focused improvements.

These include:

* ESLint security rules
* SonarJS linting
* Next.js security headers
* Improved validation
* Safer server-side operations
* Better handling of application configuration

The project also includes automated development checks through linting and type checking.

---

# ⚡ Deployment Improvements

The project has gone through several deployment-focused fixes.

Recent work included:

* Fixes for production signup failures
* Railway deployment compatibility changes
* Cloud deployment configuration improvements
* Email provider migration away from SMTP
* Environment variable cleanup
* Production authentication fixes

The application is currently designed to work in a deployed environment rather than only locally.

---

# 🧠 Recent Development Updates

The latest development history includes the following major changes:

### Email Verification

* Replaced SMTP/Nodemailer OTP delivery with Brevo HTTP API
* Added Brevo sender configuration
* Improved OTP error handling

### Financial Analysis

* Added a dedicated financial analysis action
* Added additional financial calculations and insights

### Benchmark Comparison

* Added benchmark financial data
* Added benchmark comparison logic
* Added visual benchmark comparison UI

### Upcoming Bills

* Added upcoming bills dashboard component

### AI Chat

* Added AI chat history
* Improved AI provider routing
* Added retry/provider fallback improvements

### Dashboard & Insights

* Improved dashboard calculations
* Updated financial insights UI
* Improved savings simulator
* Added benchmark visualization

### Transactions

* Improved CSV uploader
* Improved statement view
* Improved transaction form
* Improved transaction table
* Added transaction tab utility

### UI

* Updated top navigation
* Improved mobile layouts
* Improved transition page
* Updated responsive behavior

### Deployment & Production

* Fixed deployed signup issues
* Added Railway deployment fixes
* Improved production environment configuration

---

# 🛠️ Tech Stack

| Technology      | Purpose                        |
| --------------- | ------------------------------ |
| Next.js 15      | Full-stack web framework       |
| React           | Frontend UI                    |
| TypeScript      | Type safety                    |
| Tailwind CSS    | Styling                        |
| MongoDB         | Database                       |
| Mongoose        | MongoDB object modeling        |
| NextAuth        | Authentication                 |
| Google Gemini   | Primary AI provider            |
| Groq            | AI fallback provider           |
| Brevo API       | OTP email delivery             |
| Recharts        | Data visualization             |
| Framer Motion   | UI animations                  |
| Radix UI        | UI primitives                  |
| React Hook Form | Form handling                  |
| Zod             | Validation                     |
| PapaParse       | CSV processing                 |
| XLSX            | Excel processing               |
| unpdf           | PDF statement processing       |
| bcryptjs        | Password hashing               |
| ESLint Security | Security linting               |
| SonarJS         | Code quality/security analysis |

---

# 📁 Project Structure

```text
smart-expense/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── insights/
│   │   │   └── chat/
│   │   │
│   │   └── api/
│   │
│   ├── actions/
│   │   ├── analysis.ts
│   │   ├── auth.ts
│   │   ├── dashboard.ts
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   └── ...
│   │
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── insights/
│   │   ├── charts/
│   │   ├── shell/
│   │   └── ui/
│   │
│   ├── db/
│   │
│   └── lib/
│       ├── benchmarks.ts
│       ├── email.ts
│       ├── transactions-tab.ts
│       └── ...
│
├── public/
├── scripts/
├── package.json
├── .env.example
└── README.md
```

---

# ⚙️ Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/mayankatulkar26/HackInMotion-RICR-HIM-1016.git
```

## 2. Enter the Project

```bash
cd HackInMotion-RICR-HIM-1016/smart-expense
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create:

```text
.env.local
```

Example configuration:

```env
# Database
DATABASE_URL=your_mongodb_connection_string
MONGODB_URI=your_mongodb_connection_string

# Authentication
AUTH_SECRET=your_secret
AUTH_URL=http://localhost:3000

NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# Email / OTP
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM=Wealth Sight <your_verified_email@example.com>

# AI
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

---

# 🔑 AI API Keys

## Google Gemini

Get an API key from:

```text
https://aistudio.google.com/apikey
```

## Groq

Get an API key from:

```text
https://console.groq.com/keys
```

Gemini is used as the preferred AI provider while Groq can act as the fallback.

---

# 📧 Brevo Email Setup

The current project uses the Brevo API for OTP email verification.

Create a Brevo API key and configure:

```env
BREVO_API_KEY=your_api_key
BREVO_FROM=Wealth Sight <your_verified_sender_email>
```

Unlike SMTP-based delivery, this sends emails through an HTTPS API request.

---

# 🗄️ Database

Wealth Sight uses:

**MongoDB + Mongoose**

Example:

```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/smart-expense
```

MongoDB Atlas can be used for the hosted database.

---

# 📈 Application Flow

```text
                 User
                   │
                   ▼
             Login / Signup
                   │
                   ▼
               Dashboard
                   │
       ┌───────────┼────────────┐
       │           │            │
       ▼           ▼            ▼
 Transactions    Budgets     Savings Goals
       │
       ├── Manual Entry
       ├── CSV Import
       ├── Excel Import
       ├── Statement Import
       └── AI Categorization
                   │
                   ▼
             Financial Analysis
                   │
        ┌──────────┼───────────┐
        │          │           │
        ▼          ▼           ▼
    Insights   Benchmarks   Upcoming Bills
        │
        ▼
              AI Assistant
                   │
             ┌─────┴─────┐
             ▼           ▼
          Gemini       Groq
             │           │
             └─────┬─────┘
                   ▼
          Personalized Response
```

---

# 🎯 Problem We Are Solving

Managing personal finances becomes difficult when users have many transactions and financial statements.

Users often know **how much money they have**, but not necessarily:

* Where their money is going
* Which categories consume the most
* Whether they are overspending
* How their spending compares with benchmarks
* How much they should save
* Which financial habits they should change

Wealth Sight combines:

```text
Financial Data
      ↓
Transaction Management
      ↓
Categorization
      ↓
Analytics
      ↓
Benchmark Comparison
      ↓
Financial Health
      ↓
AI Insights
      ↓
Better Decisions
```

---

# 💡 Why Wealth Sight?

Wealth Sight is more than a simple expense tracker.

It combines:

**Transaction Management + Analytics + AI + Financial Planning**

into a single application.

The aim is to make financial information understandable for normal users rather than presenting only raw numbers.

---

# 🏆 Hackathon

Built for:

**Hack In Motion – RICR**

Theme:

**FinTech**

Project:

**Wealth Sight**

---

# 🚀 Live Demo

**Deployed Website:**

https://hackinmotion-ricr-him-1016.onrender.com/

---

# 📂 Repository

**GitHub Repository:**

https://github.com/mayankatulkar26/HackInMotion-RICR-HIM-1016

**Project Folder:**

```text
smart-expense
```

---

# 🔮 Future Improvements

Possible future additions include:

* Bank API integration
* Automatic recurring-payment detection
* Advanced financial forecasting
* Emergency fund planning
* Investment tracking
* Multi-account support
* Bill reminders
* More personalized benchmarking
* Advanced AI recommendations
* Mobile application
* Automated financial alerts

---

# 👨‍💻 Project

Wealth Sight was developed as a hackathon project with the goal of making personal finance:

**Simpler. Smarter. More Understandable.**

---

# 📄 License

This project is created for educational and hackathon purposes.
