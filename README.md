# RaderX - Strategic Intelligence Agent

## Team Members
* Vibhav Patel
* Mahesh Banger 
* Saksham Patil
* Saisha Asane
* Yuvraj Kumar

## Problem Statement
Organizations, startups, and research institutions operate in highly competitive and rapidly evolving environments where staying updated on research trends, patent developments, competitor strategies, and industry news is critical. However, manually monitoring scientific publications, patent databases, news platforms, and social media sources is time-consuming, inefficient, and prone to missing important updates. The lack of timely insights can result in lost opportunities, delayed innovation, and weakened competitive positioning. Therefore, there is a need for an autonomous AI agent capable of continuously tracking research and competitor activities, analyzing vast information sources, and delivering concise, actionable insights in real time.

## Project Description
Our solution is an **Autonomous Strategic Intelligence Agent** built using the OpenAI API. Instead of relying on a hardcoded pipeline, our intelligent agent dynamically queries multiple data sources (academic research via OpenAlex, patent databases, and news/web trends) based on the user's strategic question. It autonomously correlates evidence across these distinct sources to identify verified strategic signals, classifies them as Threats or Opportunities, scores their confidence and impact, and outputs a prioritized, structured intelligence report.

## Technologies Used
- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API Routes, Vercel Serverless Functions
- **Database:** MongoDB
- **AI/Agents:** OpenAI Node.js SDK (GPT-4o) with strict structured outputs (Zod)
- **APIs/Tools:** OpenAlex API (Research), Simulated Patent/Web News endpoints
- **Infrastructure:** Vercel Cron Jobs (for automated monitoring/watches)

## Features
- **Autonomous Agentic Loop:** The AI decides which tools to call, evaluates the evidence, and searches again if needed, never relying on a deterministic, hardcoded sequence.
- **Cross-Source Correlation:** Discovers relationships between scientific research, patent filings, and market news to derive high-value strategic signals.
- **Threat/Opportunity Classification:** Automatically grades signals on confidence and impact metrics.
- **Continuous Monitoring (Watches):** Save any investigation as a "Watch" to be automatically re-scanned weekly via Vercel Cron Jobs, persisting only net-new signals to MongoDB.
- **Full Dashboard Integration:** Beautiful, functional UI to track active monitoring, recent reports, and top-level critical discoveries.

## Installation / Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd eminence-agentx24-task1
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` or `.env.local` file in the root directory and add:
   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key
   MONGODB_URI=your_mongodb_connection_string
   
   # Optional (for Web Search & Patent Tools)
   SERP_API_KEY=your_serp_api_key
   PATENT_API_KEY=your_patent_api_key
   
   # Optional (for Vercel Cron authorization)
   CRON_SECRET=your_secret_string
   MONGODB_DB=task1web
   ```

## How to Run the Project

1. **Start the Development Server:**
   ```bash
   npm run dev
   ```
2. **Access the Application:**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000).
3. **Run an Investigation:**
   Click on "New Investigation", enter your strategic question, and watch the agent execute its timeline!

## Screenshots / Demo Link
*Demo Link:* [https://eminence-agentx24-task1.vercel.app/](https://eminence-agentx24-task1.vercel.app/)



