# Wealth Sight 💰

### AI-Powered Personal Finance & Financial Health Dashboard

Wealth Sight is a smart finance management web application built for the **Hack In Motion – FinTech** challenge.

The idea is simple: instead of manually checking every transaction and trying to understand where your money goes, Wealth Sight brings everything into one dashboard.

You can add your transactions, upload statement files, track spending, manage budgets and savings goals, and use AI-powered insights to better understand your financial habits.

---

## 🚀 What Wealth Sight Does

Wealth Sight helps users:

* 📊 View their overall financial health
* 💳 Track income and expenses
* 📁 Import transaction data from files
* 🏷️ Categorize transactions automatically
* 💰 Create and track budgets
* 🎯 Set savings goals
* 📈 Understand spending patterns
* 🤖 Get AI-powered financial insights
* 💬 Interact with an AI finance assistant
* 🔐 Secure their account with authentication

The dashboard is designed to make personal finance easier to understand instead of showing users a lot of confusing numbers.

---

## ✨ Main Features

### 🔐 Authentication

Users can create an account and securely log in.

* Login / Signup
* Password protection
* NextAuth authentication
* Protected dashboard routes

---

### 📊 Financial Dashboard

The main dashboard gives a quick overview of your money.

It includes:

* Income
* Expenses
* Balance
* Spending overview
* Recent transactions
* Financial health information
* Month-based filtering

The dashboard also updates based on the selected time period.

---

### 💳 Transaction Management

Users can manage their transactions directly from the application.

Supported operations include:

* Add transactions manually
* View transactions
* Search transactions
* Filter transactions
* Categorize transactions
* Track income and expenses

---

### 📂 Transaction Import

Instead of entering everything manually, users can import transaction data from files.

The project includes support for processing:

* CSV files
* Excel/XLSX data
* Financial statement data

This makes it easier to move existing banking data into Wealth Sight.

---

### 🤖 AI Transaction Categorization

Wealth Sight uses a hybrid approach for transaction categorization.

First, known transaction patterns and merchant names are checked.

If the transaction cannot be confidently categorized, AI can be used to classify it.

The project supports:

* Google Gemini
* Groq as an AI fallback

This allows the application to continue working even when one AI provider is unavailable.

---

### 💡 AI Financial Insights

The application can use transaction data to generate useful financial insights.

Examples include:

* Spending patterns
* Unusual spending
* High-spending categories
* Financial behavior
* Personalized suggestions

The goal is not just to show data, but to explain what the data means.

---

### 💬 AI Finance Assistant

Wealth Sight also includes an AI chat experience designed around personal finance.

Users can ask questions about their spending and financial data and get AI-generated responses.

For example:

> "Where am I spending the most?"

> "How can I reduce my monthly expenses?"

> "How much should I save?"

---

### 💰 Budget Management

Users can create budgets for different spending categories.

The dashboard helps track progress using visual indicators so users can quickly see whether they are within their planned spending limits.

---

### 🎯 Savings Goals

Users can create savings goals and monitor their progress.

For example:

* New phone
* Laptop
* Emergency fund
* Travel
* Personal goals

Each goal can be tracked over time.

---

## 🧠 How The AI System Works

The application follows a simple fallback strategy:

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

This approach helps reduce unnecessary AI requests while still allowing the system to handle unfamiliar transactions.

---

## 🛠️ Tech Stack

| Technology      | Purpose                  |
| --------------- | ------------------------ |
| Next.js 15      | Full-stack web framework |
| React           | Frontend UI              |
| TypeScript      | Type safety              |
| Tailwind CSS    | Styling                  |
| MongoDB         | Database                 |
| Mongoose        | MongoDB object modeling  |
| NextAuth        | Authentication           |
| Google Gemini   | AI features              |
| Groq            | AI fallback              |
| Recharts        | Data visualization       |
| Framer Motion   | UI animations            |
| Radix UI        | UI primitives            |
| React Hook Form | Forms                    |
| Zod             | Validation               |
| PapaParse       | CSV processing           |
| XLSX            | Excel file processing    |
| Nodemailer      | Email functionality      |

The repository's current dependency setup confirms the main framework, database, AI, charting, file-processing, authentication and UI libraries listed above.

---

## 📁 Project Structure

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
│   │   ├── dashboard.ts
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   └── ...
│   │
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── charts/
│   │   └── ui/
│   │
│   ├── db/
│   │
│   └── lib/
│
├── public/
├── scripts/
├── package.json
├── .env.example
└── README.md
```

The repository currently includes dashboard server actions and dedicated dashboard/transaction components, matching this application structure.

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mayankatulkar26/HackInMotion-RICR-HIM-1016.git
```

### 2. Enter the project

```bash
cd HackInMotion-RICR-HIM-1016/smart-expense
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create environment variables

Create a `.env.local` file and add the required values.

Example:

```env
MONGODB_URI=your_mongodb_connection_string
DATABASE_URL=your_database_url

AUTH_SECRET=your_secret_key
AUTH_URL=http://localhost:3000

NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000

GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

EMAIL_USER=your_email
EMAIL_PASSWORD=your_app_password
```

The repository's `.env.example` currently defines MongoDB, email, NextAuth, Gemini and Groq configuration variables.

---

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🔑 AI API Keys

Wealth Sight supports two AI providers.

### Google Gemini

Get a Gemini API key from:

```text
https://aistudio.google.com/apikey
```

### Groq

Get a Groq API key from:

```text
https://console.groq.com/keys
```

Gemini is intended to be the preferred provider while Groq can act as a fallback.

---

## 🗄️ Database

The current application uses **MongoDB** with **Mongoose**.

Example:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-expense
```

You can use MongoDB Atlas for a cloud database.

---

## 📈 Application Flow

```text
User
 │
 ▼
Login / Signup
 │
 ▼
Dashboard
 │
 ├── Transactions
 │      ├── Manual Entry
 │      ├── CSV / Excel Import
 │      └── Categorization
 │
 ├── Budgets
 │
 ├── Savings Goals
 │
 ├── Financial Insights
 │
 └── AI Chat
        │
        ▼
   Gemini / Groq
        │
        ▼
   Personalized Response
```

---

## 🎯 Problem We Are Solving

Managing personal finances can become difficult when users have many transactions spread across different bank accounts or statements.

Most people can see their transactions, but they don't always understand:

* Where their money is going
* Which categories consume the most money
* Whether they are overspending
* How much they should save
* What financial habits they should change

Wealth Sight tries to solve this by combining **transaction management + analytics + AI** in one place.

---

## 💡 Why Wealth Sight?

Instead of being only an expense tracker, Wealth Sight focuses on the bigger picture.

```text
Raw Financial Data
        ↓
Organized Transactions
        ↓
Spending Analysis
        ↓
Financial Health
        ↓
AI Insights
        ↓
Better Financial Decisions
```

The objective is to turn financial data into something a normal user can actually understand and use.

---

## 🏆 Hackathon

Built for:

**Hack In Motion – RICR**

Theme:

**FinTech**

Project:

**Wealth Sight**

---

## 🚧 Future Improvements

Some improvements that can be added later:

* Bank API integration
* Automatic recurring-payment detection
* Better financial forecasting
* Emergency fund planning
* Investment tracking
* Multi-account support
* Bill reminders
* Financial benchmarking
* Smarter AI recommendations
* Mobile application

---

## 👨‍💻 Team / Project

Built as a hackathon project with the goal of making personal finance easier, smarter and more understandable.

🚀 **Deployed Website:**  
https://hackinmotion-ricr-him-1016.onrender.com/

Try Wealth Sight live without running the project locally.


**Repository:**
https://github.com/mayankatulkar26/HackInMotion-RICR-HIM-1016

**Project Folder:**
`smart-expense`

---

## 📄 License

This project is created for educational and hackathon purposes.
