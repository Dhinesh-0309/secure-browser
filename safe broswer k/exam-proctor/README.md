# ProctorAI — AI Proctored Exam System

A browser-based exam platform with real-time AI proctoring. No installation required for students — just a link.

---

## What it does

- Admin creates exams with questions, duration, and a shareable link
- Students open the link, grant camera access, and take the exam
- AI monitors the session live — detecting faces, extra persons, phones, tab switches
- Admin reviews results, integrity scores, and violation logs
- Export results as CSV

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- A modern browser (Chrome recommended for camera access)
- Internet connection (loads AI models from CDN)

---

## Setup

### macOS

```bash
# 1. Clone the repo
git clone https://github.com/Dhinesh-0309/secure-browser.git

# 2. Go into the project folder
cd secure-browser/exam-proctor

# 3. Install dependencies
npm install

# 4. Start the server
node server.js
```

Then open your browser and go to: **http://localhost:3000**

---

### Windows

Open **Command Prompt** or **PowerShell**, then:

```cmd
# 1. Clone the repo
git clone https://github.com/Dhinesh-0309/secure-browser.git

# 2. Go into the project folder
cd secure-browser\exam-proctor

# 3. Install dependencies
npm install

# 4. Start the server
node server.js
```

Then open your browser and go to: **http://localhost:3000**

---

## How to use

### As Admin
1. Click **Admin** in the sidebar
2. Go to **Create Exam** tab
3. Fill in the title, duration, and add questions
4. Click **Create Exam & Get Code** — you'll get a code and a shareable link
5. Send the link to your students
6. After the exam, go to the **Results** tab to view scores and violations
7. Click **Export CSV** to download results

### As Student
1. Open the link your admin shared (or go to the portal and enter the exam code)
2. Enter your full name and agree to the monitoring notice
3. Allow camera access when prompted
4. Complete the exam and click **Submit**

---

## Notes

- The server runs on port **3000** by default
- Data is stored in `db.json` (auto-created on first run)
- Camera access is required — the exam cannot start without it
- AI models are loaded from CDN on first use, so the first session may take a few seconds to initialize
- For best results use **Google Chrome** or **Microsoft Edge**

---

## Tech Stack

- **Backend** — Node.js, Express
- **Frontend** — Vanilla JS, HTML, CSS
- **AI** — face-api.js (face detection), TensorFlow.js + COCO-SSD (object detection)
- **Database** — JSON flat file (`db.json`)
