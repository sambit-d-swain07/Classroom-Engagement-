/**
 * PROJECT: AURA | Engagement Intelligence
 * CORE ENGINE: Relational Logic & Security Handshake
 */

// --- 1. RELATIONAL DATABASE (LocalStorage) ---
const DB = {
    // Schema: AURA_STUDENTS = [{ id, name, email, role: 'student', trustScore: 100, violations: [], lastBuffer: timestamp }]
    // Schema: AURA_TEACHERS = [{ id, name, email, role: 'teacher' }]

    // Buckets
    STUDENTS: 'AURA_STUDENTS',
    TEACHERS: 'AURA_TEACHERS',
    SESSION: 'AURA_SESSION_V2',

    getStudents: () => JSON.parse(localStorage.getItem(DB.STUDENTS)) || [],
    getTeachers: () => JSON.parse(localStorage.getItem(DB.TEACHERS)) || [],
    getSession: () => JSON.parse(sessionStorage.getItem(DB.SESSION)),

    saveStudent: (student) => {
        const list = DB.getStudents();
        // Check duplicate
        const exists = list.find(s => s.email === student.email);
        if (exists) return exists;
        list.push(student);
        localStorage.setItem(DB.STUDENTS, JSON.stringify(list));
        return student;
    },

    saveTeacher: (teacher) => {
        const list = DB.getTeachers();
        const exists = list.find(t => t.email === teacher.email);
        if (exists) return exists;
        list.push(teacher);
        localStorage.setItem(DB.TEACHERS, JSON.stringify(list));
        return teacher;
    },

    updateStudent: (id, modifier) => {
        const list = DB.getStudents();
        const index = list.findIndex(s => s.id === id);
        if (index !== -1) {
            list[index] = modifier(list[index]);
            localStorage.setItem(DB.STUDENTS, JSON.stringify(list));
        }
    },

    setSession: (user) => sessionStorage.setItem(DB.SESSION, JSON.stringify(user)),
    clearSession: () => sessionStorage.removeItem(DB.SESSION)
};

// --- 2. AUTHENTICATION HANDLER ---
class Auth {
    constructor() {
        this.modal = document.getElementById('auth-modal');
        this.role = 'student'; // default
        this.setupListeners();
    }

    setupListeners() {
        // Toggle Switch
        const toggleBtn = document.querySelectorAll('.toggle-btn');
        const slider = document.querySelector('.toggle-slider');

        toggleBtn.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.role = e.target.dataset.role;

                // UI Update
                toggleBtn.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                if (this.role === 'teacher') {
                    slider.style.transform = 'translateX(100%)';
                    slider.style.background = 'var(--secondary)';
                } else {
                    slider.style.transform = 'translateX(0)';
                    slider.style.background = 'var(--primary)';
                }
            });
        });

        // Login/Signup Form
        const form = document.getElementById('auth-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Modal triggers
        document.querySelectorAll('a[href="#login"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                this.modal.classList.add('active');
            });
        });

        // Close modal on outside click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.modal.classList.remove('active');
            });
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const name = email.split('@')[0]; // Simple name extraction

        const user = {
            id: Date.now().toString(36),
            name: name,
            email: email,
            role: this.role,
            joined: Date.now()
        };

        if (this.role === 'student') {
            user.trustScore = 100;
            user.violationLog = [];
            DB.saveStudent(user);
            DB.setSession(user);
            window.location.href = 'student.html';
        } else {
            DB.saveTeacher(user);
            DB.setSession(user);
            window.location.href = 'teacher.html';
        }
    }
}

// --- 3. STUDENT ENGINE (ANTI-GRAVITY SECURITY) ---
class StudentEngine {
    constructor(user) {
        this.user = user;
        this.video = document.getElementById('lesson-player');
        this.init();
    }

    init() {
        // Overlay for Blur
        this.recalibrateOverlay = document.createElement('div');
        this.recalibrateOverlay.className = 'recalibrate-overlay';
        this.recalibrateOverlay.innerHTML = `
            <h2 style="font-size: 2.5rem; color: var(--alert); font-family: var(--font-heading); margin-bottom: 0.5rem;">
            FOCUS RECALIBRATING...</h2>
            <p style="color: var(--text-main); letter-spacing: 2px;">RETURN TO SESSION</p>
        `;
        document.body.appendChild(this.recalibrateOverlay);

        // Overlay for Blackout
        this.blackoutOverlay = document.createElement('div');
        this.blackoutOverlay.className = 'blackout-overlay';
        this.blackoutOverlay.innerText = "PROTECTED CONTENT";
        document.body.appendChild(this.blackoutOverlay);

        this.bindSecurity();
        this.preventForwarding();
        this.startTelemetry();

        // Initial dashboard render
        this.updateSidebar();
    }

    bindSecurity() {
        // 1. Silent Violation HUD (Tab Switching) -> Blur
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.triggerViolation('Tab Switch');
                document.body.classList.add('recalibrating');
            } else {
                document.body.classList.remove('recalibrating');
            }
        });

        window.addEventListener('blur', () => {
            // If window loses focus but not hidden (e.g. alt-tab or click outside), blur
            this.triggerViolation('Focus Lost');
            document.body.classList.add('recalibrating');
        });

        window.addEventListener('focus', () => {
            document.body.classList.remove('recalibrating');
        });

        // 2. Blackout Protection (Screen Share / Resize Detection)
        window.addEventListener('resize', () => {
            // Heuristic method: if resize happens rapidly or to non-std ratio, might be screen share snapping
            // Strict mode: trigger blackout momentarily

            /* Note: We can't definitively detect getDisplayMedia from here without being the initiator.
               However, window resizing is a common side effect of snapping windows for sharing.
               We will implement the blackout logic as requested.*/

            this.triggerBlackout();
        });

        // Prevent Right Click
        document.addEventListener('contextmenu', event => event.preventDefault());
    }

    triggerBlackout() {
        if (this.video) this.video.style.opacity = '0';
        document.body.classList.add('blackout');

        setTimeout(() => {
            if (this.video) this.video.style.opacity = '1';
            document.body.classList.remove('blackout');
        }, 1500); // 1.5s penalty
    }

    preventForwarding() {
        if (!this.video) return;

        let maxWatchedTime = 0;

        // Track max watched time
        this.video.addEventListener('timeupdate', () => {
            if (!this.video.seeking) {
                if (this.video.currentTime > maxWatchedTime) {
                    maxWatchedTime = this.video.currentTime;
                }
            }
        });

        // Block internal seeking
        this.video.addEventListener('seeking', () => {
            // Buffer of 0.5s allowed to prevent stuck loops
            if (this.video.currentTime > maxWatchedTime + 0.5) {
                this.video.currentTime = maxWatchedTime;
                this.showToast("Forwarding Prohibited by Proctor");
            }
        });
    }

    showToast(msg) {
        let toast = document.getElementById('aura-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'aura-toast';
            toast.className = 'aura-toast';
            toast.innerHTML = `<i class="fa-solid fa-lock"></i> <span></span>`;
            document.body.appendChild(toast);
        }

        toast.querySelector('span').innerText = msg;
        toast.classList.add('show');

        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    triggerViolation(type) {
        // Debounce slightly to avoid flood
        const now = Date.now();
        // Update DB
        DB.updateStudent(this.user.id, (student) => {
            student.trustScore = Math.max(0, student.trustScore - 5);
            student.violationLog.push({
                type: type,
                timestamp: now
            });
            // Update local session object as well for instant UI feedback
            this.user = student;
            return student;
        });

        this.updateSidebar();
    }

    startTelemetry() {
        // Poll for updates every second (simulates live connection)
        setInterval(() => {
            // Update sidebar time or status
        }, 1000);
    }

    updateSidebar() {
        const scoreEl = document.getElementById('trust-score');
        const feedEl = document.getElementById('event-feed');

        if (scoreEl) {
            scoreEl.innerText = this.user.trustScore + '%';
            scoreEl.style.color = this.user.trustScore < 70 ? 'var(--alert)' : 'var(--secondary)';
        }

        if (feedEl && this.user.violationLog) {
            const logs = this.user.violationLog.slice(-5).reverse(); // Last 5
            feedEl.innerHTML = logs.map(log => `
                <div style="padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem;">
                    <span style="color: var(--alert)">⚠ ${log.type}</span>
                    <div style="color: var(--text-muted); font-size: 0.7rem; margin-top: 2px;">
                        ${new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            `).join('');

            if (logs.length === 0) {
                feedEl.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); text-align:center;">No violations detected.</div>`;
            }
        }
    }
}

// --- 4. TEACHER COMMAND CENTER ---
class TeacherDeck {
    constructor(user) {
        this.user = user;
        this.grid = document.getElementById('student-grid-body');
        this.init();
    }

    init() {
        this.render();
        // Live polling
        setInterval(() => this.render(), 2000);
    }

    render() {
        const students = DB.getStudents();
        const activeCount = students.length; // In real app, check online status

        // Update KPIs
        document.getElementById('kpi-violations').innerText = students.reduce((acc, s) => acc + s.violationLog.length, 0);

        // Render Table
        if (this.grid) {
            this.grid.innerHTML = students.map(s => {
                const status = s.trustScore < 50 ? 'Critical' : (s.trustScore < 80 ? 'Monitor' : 'Good');
                const statusColor = s.trustScore < 50 ? 'var(--alert)' : (s.trustScore < 80 ? '#facc15' : 'var(--secondary)');

                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s; cursor: pointer;" onclick="alert('Viewing logs for ${s.name}')">
                    <td style="padding: 1rem;">
                        <div style="font-weight: 600; color: white;">${s.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.id}</div>
                    </td>
                    <td style="padding: 1rem;">
                        <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                            ${status}
                        </span>
                    </td>
                    <td style="padding: 1rem; font-weight: 700; color: ${statusColor}">${s.trustScore}%</td>
                    <td style="padding: 1rem; color: var(--text-muted)">${s.violationLog.length}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-glass" style="padding: 0.4rem 1rem; font-size: 0.75rem;">View Logs</button>
                    </td>
                </tr>
                `;
            }).join('');
        }
    }
}

// --- 5. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {

    // Check page role
    const body = document.body;
    const session = DB.getSession();

    // Index Page
    if (!body.dataset.role) {
        new Auth();
        // If already logged in, maybe redirect? Optional.
    }

    // Student Page
    else if (body.dataset.role === 'student') {
        if (!session || session.role !== 'student') {
            window.location.href = 'index.html'; // Security Redirect
            return;
        }
        new StudentEngine(session);
    }

    // Teacher Page
    else if (body.dataset.role === 'teacher') {
        if (!session || session.role !== 'teacher') {
            window.location.href = 'index.html'; // Security Redirect
            return;
        }
        new TeacherDeck(session);
    }
});
