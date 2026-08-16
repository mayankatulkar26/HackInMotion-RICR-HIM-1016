# 💰 Wealth Sight

## Educational Personal Finance & Financial Health Dashboard

Wealth Sight is a full-stack personal finance web application designed for **educational and learning purposes**.

The application helps users understand their financial activity by combining:

- Personal finance management
- Expense tracking
- Income management
- Budget planning
- Savings goals
- Financial analytics
- Benchmark comparison
- AI-assisted transaction categorization
- AI-powered financial insights
- AI finance assistance
- Upcoming bill tracking
- Financial health visualization

The project demonstrates how modern full-stack technologies, databases, authentication, data processing, analytics, and AI services can be combined to build a practical financial application.

> **Disclaimer:** Wealth Sight is an educational and demonstration application. Financial calculations, AI-generated insights, benchmark comparisons, and recommendations should not be considered professional financial advice.

---

# 🌐 Live Application

## 🚀 Production Website

**Live Demo:**

https://wealth-sight-production.up.railway.app/

---

# 📌 About Wealth Sight

Managing personal finances can become difficult when financial information is spread across transactions, bills, budgets, savings goals, and financial statements.

Wealth Sight provides a centralized platform where users can:

- Track income and expenses
- Analyze spending patterns
- Create budgets
- Set savings goals
- Import financial data
- Categorize transactions
- Monitor upcoming bills
- Compare spending with benchmark data
- Analyze financial health
- Generate AI-assisted financial insights
- Interact with an AI finance assistant

The primary objective is to make financial information **easier to understand, analyze, and learn from**.

---

# ✨ Features

## 📊 Financial Dashboard

The dashboard provides an overview of the user's financial activity.

It includes:

- Total income
- Total expenses
- Current balance
- Financial health indicators
- Recent transactions
- Spending summaries
- Monthly analysis
- Interactive charts
- Upcoming bills
- Budget information
- Savings progress

The dashboard dynamically presents financial information based on the user's available transaction data.

---

# 💳 Transaction Management

Users can manage their financial transactions from a dedicated interface.

### Supported Operations

- Add transactions
- Edit transactions
- Delete transactions
- Search transactions
- Filter transactions
- Categorize transactions
- Track income
- Track expenses
- View transaction statistics

Transactions are used throughout the application for financial analysis and insight generation.

---

# 📂 Financial Data Import

Wealth Sight allows users to import existing financial information instead of manually entering every transaction.

### Supported Formats

- CSV
- Excel / XLSX
- PDF financial statements

The application processes imported information and converts it into structured transaction data.

### Data Processing Flow

```text
Financial Statement
        │
        ▼
   File Upload
        │
        ▼
 Data Extraction
        │
        ▼
Transaction Processing
        │
        ▼
   Categorization
        │
        ▼
Financial Analysis


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

# 🚀 Live Demo

**Deployed Website:**

https://wealth-sight-production.up.railway.app/

---

# 📂 Repository

**GitHub Repository:**

https://github.com/mayankatulkar26/Wealth-Sight/tree/main

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



# 📄 License

This project is provided for educational and demonstration purposes.
