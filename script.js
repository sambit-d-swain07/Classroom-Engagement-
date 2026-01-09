/**
 * Project: Anti-Cheat & Engagement System
 * Logic: Core functional classes for Student & Teacher views
 */

// --- UTILITIES ---
const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || null,
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    // Initialize mock data if empty
    init: () => {
        if (!Storage.get('class_data')) {
            const mockStudents = [
                { id: 1, name: "Maria Garcia", violations: 0, watchTime: 540, status: "Offline" },
                { id: 2, name: "Liam Johnson", violations: 5, watchTime: 120, status: "Offline" },
                { id: 3, name: "Aisha Patel", violations: 1, watchTime: 400, status: "Offline" }
            ];
            Storage.set('class_data', mockStudents);
        }
    }
};

const Format = {
    time: (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
};

// --- STUDENT LOGIC ---
class StudentProctor {
    constructor() {
        this.video = document.getElementById('lesson-video');
        this.overlay = document.getElementById('warning-modal');
        this.stats = {
            violations: 0,
            watchTime: 0,
            sessionActive: false
        };
        this.lastTime = 0;
        this.timerInterval = null;
        
        this.bindEvents();
        this.loadSession();
        this.startTimer();
    }

    bindEvents() {
        // 1. Visibility API (Tab Switch/Minimize)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.triggerViolation("Tab Switched / Background");
            }
        });

        // 2. Window Blur (Focus Lost - e.g., clicking another app)
        window.addEventListener('blur', () => {
            // Only trigger if video is playing to avoid annoying false positives on startup
            if (!this.video.paused) {
                this.triggerViolation("Window Focus Lost");
            }
        });

        // 3. Anti-Seek (Prevent Fast Forward)
        this.video.addEventListener('timeupdate', () => {
            if (!this.video.seeking) {
                this.lastTime = this.video.currentTime;
            }
        });

        this.video.addEventListener('seeking', () => {
            // Allow rewinding, prevent forwarding more than a small buffer
            if (this.video.currentTime > this.lastTime + 1) {
                console.log("Anti-Seek triggered");
                this.video.currentTime = this.lastTime;
                // Optional: Show toast or warning for seeking
            }
        });

        // Resume Button
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeSession();
        });
    }

    triggerViolation(reason) {
        if (this.overlay.classList.contains('active')) return;

        this.stats.violations++;
        this.video.pause();
        this.overlay.classList.add('active');
        this.updateUI();
        this.sync("Suspicious");
        
        console.warn(`Violation: ${reason}`);
    }

    resumeSession() {
        this.overlay.classList.remove('active');
        this.video.play();
        this.sync("Active");
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.video.paused && document.visibilityState === 'visible') {
                this.stats.watchTime++;
                this.updateUI();
                
                // Sync every 5s to avoid storage spam
                if (this.stats.watchTime % 5 === 0) this.sync("Active");
            }
        }, 1000);
    }

    updateUI() {
        document.getElementById('violation-count').innerText = this.stats.violations;
        document.getElementById('watch-time').innerText = Format.time(this.stats.watchTime);
        
        // Dynamic color for violations
        const vEl = document.getElementById('violation-count');
        vEl.style.color = this.stats.violations > 0 ? 'var(--danger)' : 'var(--success)';
    }

    sync(status) {
        // We simulate "Current User" as a specific entry in the Class Data
        const currentData = {
            id: 'current-user',
            name: "You (Current Session)",
            violations: this.stats.violations,
            watchTime: this.stats.watchTime,
            status: status,
            lastUpdate: Date.now()
        };
        
        // Merge with existing class data
        let allData = Storage.get('class_data') || [];
        // Remove old 'current-user' if exists to update it
        allData = allData.filter(d => d.id !== 'current-user');
        allData.push(currentData);
        
        Storage.set('class_data', allData);
    }

    loadSession() {
        // Reset for demo purposes, or load previous state if desired
        // this.sync("Ready"); 
        // For this demo, we start fresh on reload
    }
}

// --- TEACHER LOGIC ---
class TeacherDashboard {
    constructor() {
        this.tableBody = document.getElementById('student-table-body');
        this.init();
    }

    init() {
        // Initial load
        this.render();
        // Poll for updates (Real-time simulation)
        setInterval(() => this.render(), 2000);
    }

    render() {
        const data = Storage.get('class_data') || [];
        // Sort: Current user first, then by violations desc
        data.sort((a, b) => {
            if (a.id === 'current-user') return -1;
            if (b.id === 'current-user') return 1;
            return b.violations - a.violations;
        });

        this.tableBody.innerHTML = data.map(student => {
            const score = this.calculateScore(student);
            const statusBadge = this.getStatusBadge(student.status);
            const isSuspicious = student.violations > 3;
            
            return `
                <tr class="${isSuspicious ? 'row-suspicious' : ''}">
                    <td>
                        <div style="font-weight: 500">${student.name}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${Format.time(student.watchTime)}</td>
                    <td>
                        <span style="color: ${student.violations > 0 ? 'var(--danger)' : 'var(--text-muted)'}">
                            ${student.violations}
                        </span>
                    </td>
                    <td>${score}</td>
                </tr>
            `;
        }).join('');
    }

    calculateScore(student) {
        // Simple algo: 100 - (violations * 10). Min 0.
        let score = 100 - (student.violations * 10);
        if (score < 0) score = 0;
        
        let color = 'var(--success)';
        if (score < 75) color = '#facc15'; // yellow
        if (score < 50) color = 'var(--danger)'; 
        
        return `<span style="color: ${color}; font-weight: 700">${score}%</span>`;
    }

    getStatusBadge(status) {
        if (status === 'Active') return `<span class="badge badge-success">Active</span>`;
        if (status === 'Suspicious') return `<span class="badge badge-danger">Suspicious</span>`;
        return `<span class="badge badge-neutral">Offline</span>`;
    }
}

// Router logic (simple check)
document.addEventListener('DOMContentLoaded', () => {
    Storage.init();
    
    if (document.getElementById('lesson-video')) {
        new StudentProctor();
    } else if (document.getElementById('student-table-body')) {
        new TeacherDashboard();
    }
});
