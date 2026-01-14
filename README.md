# Aura Intelligence 🛡️
### Next-Generation AI Proctoring & Immersive Learning Platform

Aura Intelligence is a secure, privacy-first learning management system designed to enforce academic integrity through advanced browser-based telemetry. It combines a premium "Cosmic Dawn" aesthetic with military-grade proctoring features, running entirely client-side without external cloud dependencies.

---

## 🚀 Key Features

### 1. 🔒 Advanced Proctoring Engine ("Anti-Gravity")
*   **Focus Enforcement**: Detects tab switching, window minimization, and application blurring.
    *   **Penalty Lockout**: Enforces a 3-second "Recalibrating" blackout penalty on focus loss.
    *   **Score Deduction**: Automatically deducts points for violations (Tab Switch: -5 pts).
*   **Anti-Tamper Suite**:
    *   **DevTools Trap**: Detects and penalizes attempts to open Inspector/Console (-10 pts).
    *   **Debugger Detection**: Pauses execution and penalizes severe tampering (-10 pts).
    *   **Input Hardening**: Blocks Right-Click, Copy/Paste, Drag-and-Drop, and PrintScreen.
*   **Blackout Mode**: Instantly hides content if a violation is detected or the window is resized suspiciously.

### 2. 💎 Trust Score System
*   **Dynamic Scoring**: Every student starts with a 100% Trust Score.
*   **Real-time Deductions**: Violations lower the score instantly.
*   **Critical Lockout**: If a score drops below **50%**, the student is **immediately expelled** from the session. The account remains locked until a teacher intervenes.

### 3. 📹 Hybrid Video Engine
*   **Direct Upload**: Teachers can upload video lessons (`.mp4`) directly from the dashboard.
*   **IndexedDB Storage**: Videos are stored locally in the browser's IndexedDB, allowing large file persistence without server costs.
*   **Secure Playback**: Custom video player with disabled seek-forwarding and enforced "focus-to-play" logic.

### 4. 👩‍🏫 Teacher Command Center
*   **Live Telemetry**: View real-time Trust Scores and Status (Good/Monitor/Critical) for all students.
*   **Violation Logs**: Detailed audit trail of every infraction (Type, Time, Penalty).
*   **Intervention**:
    *   **Unlock Student**: One-click reset for students locked out due to low scores.
    *   **Clear Data**: Reset all lessons and student data.

---

## 🛠️ Installation & Usage

### Prerequisites
*   A modern web browser (Chrome/Edge/Firefox).
*   No backend server required! (Runs on LocalStorage/IndexedDB).

### How to Run
1.  **Clone/Download** the repository.
2.  **Serve the files**:
    *   Recommended: Run a local server (to ensure IndexedDB works correctly).
    *   Example: `npx serve .` or use "Live Server" in VS Code.
3.  **Open** `index.html` in your browser.

### Login Credentials (Simulation)
*   **Teacher Portal**:
    *   Name: `Admin Teacher`
    *   Email: `admin@aura.com`
*   **Student Portal**:
    *   Name: `Student User`
    *   Email: `student@aura.com`

*(Note: The login system is currently a simulation for demonstration purposes. Any email/name works.)*

---

## 🏗️ Technical Architecture

*   **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Variables & Glassmorphism).
*   **Storage**:
    *   **LocalStorage**: User sessions, Trust Scores, Violation Logs.
    *   **IndexedDB**: Large binary objects (Video Blobs).
*   **Security layer**: Event listener hooks on `window` and `document` level to intercept OS inputs (PrintScreen) and browser states (Visibility API).

---

## 🎨 Design Philosophy
The UI follows the **"Cosmic Dawn"** design language:
*   **Glassmorphism**: Translucent panels with backdrop blurs.
*   **Deep Space Theme**: Dark gradients (`#0f172a` to `#000000`) to reduce eye strain.
*   **Neon Accents**: `Rose-500` (Alerts) and `Emerald-500` (Success) indicators.

---

**© 2026 Aura Intelligence. Built for the Future of Education.**
