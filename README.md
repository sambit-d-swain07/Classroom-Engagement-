# Classroom-Engagement-

1. Anti-Gravity Security Suite
Blackout Protection: Automatically detects screen recording or sharing attempts. Instantly hides content (opacity: 0) and displays a "Protected Content" overlay to prevent piracy.

Tab-Switch Enforcement: Uses visibilityChange hooks to apply a 10px Gaussian blur and grayscale filter the moment a student leaves the session.

Linear Learning (Anti-Forward): Strictly prohibits video skipping. Students can re-watch previous segments, but forwarding beyond the maxWatchedTime is algorithmically blocked.

2. Relational Intelligence (DB)
Role-Based Access Control (RBAC): Distinct portals for Students and Teachers with secure session handshakes via sessionStorage.

Persistent Telemetry: Student data (Trust Scores, Violation Logs, Watch Time) is stored in segregated localStorage buckets (AURA_STUDENTS vs. AURA_TEACHERS).

3. Immersive Student HUD
Live Integrity Meter: A real-time trust score that starts at 100% and decays based on behavioral violations.

Telemetry Feed: A timestamped, live log of all system events (Tab switches, resize attempts, etc.) shown directly to the student.

🎨 Tech Stack & Design
Design System: Cosmic Dawn (Deep Obsidian #030014 & Teal #2dd4bf).

Typography: Inter & Space Grotesk for a premium SaaS feel.

Icons: Font Awesome 6.0 (Neon Glow).

Core: Vanilla JavaScript (ES6+), CSS3 (Flex/Grid/Glassmorphism).

📂 Project Structure
Bash

├── index.html      # Secure Landing & Auth Portal (Relational Login)
├── student.html    # Immersive HUD Classroom (Video + Live Telemetry)
├── teacher.html    # Admin Insight Dashboard (Executive Summary)
├── styles.css      # Cosmic Dawn Theme & Animations
├── app.js          # Core Engine (DB Logic, Security Handshakes)
└── script.js       # UI Interaction & Event Handling
🛠️ Installation & Usage
Clone the Repository:

Bash

git clone https://github.com/yourusername/aura-ai.git
Run Locally: Simply open index.html in any modern web browser.

Default Credentials:

Student: Any email ending in @aura.edu (Database initializes on first sign-up).

Teacher: Switch the toggle on the Login card to "Teacher" mode.

🛡️ Security Policy
Linear Consumption: Video forwarding is disabled by default to ensure 100% engagement.

Privacy First: All proctoring data is processed locally; no private video feeds are stored.

AURA.AI — Transforming Online Learning through Intelligent Engagement.
