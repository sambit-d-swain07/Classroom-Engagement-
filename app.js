/**
 * PROJECT: AURA | Engagement Intelligence
 * CORE ENGINE: Relational Logic & Security Handshake
 */

// --- 1. INDEXED DB (PERSISTENT VIDEO STORAGE) ---
const VideoStore = {
    dbName: 'AuraVideoDB',
    storeName: 'videos',

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(this.storeName);
            };
        });
    },

    async saveVideo(id, blob) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(blob, id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getVideo(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const req = tx.objectStore(this.storeName).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async clear() {
        const db = await this.open();
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
    }
};

// --- 2. RELATIONAL DATABASE (LocalStorage) ---
const DB = {
    // Schema: AURA_STUDENTS = [{ id, name, email, role: 'student', trustScore: 100, violations: [], lastBuffer: timestamp }]
    // Schema: AURA_TEACHERS = [{ id, name, email, role: 'teacher' }]

    // Buckets
    STUDENTS: 'AURA_STUDENTS',
    TEACHERS: 'AURA_TEACHERS',
    SESSION: 'AURA_SESSION_V2',
    LESSONS: 'AURA_LESSONS', // New Bucket

    getStudents: () => JSON.parse(localStorage.getItem(DB.STUDENTS)) || [],
    getTeachers: () => JSON.parse(localStorage.getItem(DB.TEACHERS)) || [],
    getSession: () => JSON.parse(sessionStorage.getItem(DB.SESSION)),
    getLessons: () => JSON.parse(localStorage.getItem(DB.LESSONS)) || [],

    saveStudent: (student) => {
        const list = DB.getStudents();
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

    saveLesson: (lesson) => {
        const list = DB.getLessons();
        list.unshift(lesson); // Add to top
        localStorage.setItem(DB.LESSONS, JSON.stringify(list));
    },

    deleteLesson: (id) => {
        let list = DB.getLessons();
        list = list.filter(l => l.id !== id);
        localStorage.setItem(DB.LESSONS, JSON.stringify(list));
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
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        const slider = document.querySelector('.toggle-slider');

        // Helper to switch roles & update UI
        const setRole = (newRole) => {
            this.role = newRole;

            toggleBtns.forEach(btn => {
                if (btn.dataset.role === newRole) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            if (this.role === 'teacher') {
                if (slider) {
                    slider.style.transform = 'translateX(100%)';
                    slider.style.background = 'var(--secondary)';
                }
            } else {
                if (slider) {
                    slider.style.transform = 'translateX(0)';
                    slider.style.background = 'var(--primary)';
                }
            }
        };

        // Toggle Switch Listeners
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                setRole(e.target.dataset.role);
            });
        });

        // Login/Signup Form
        const form = document.getElementById('auth-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Modal triggers (Updated to check for specific role request)
        document.querySelectorAll('a[href="#login"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();

                // If the link has a specific role (student/teacher), set it
                const requestedRole = el.dataset.authRole;
                if (requestedRole) {
                    setRole(requestedRole);
                }

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

        // CRITICAL CHECK ON LOAD
        if (this.user.trustScore < 50) {
            this.triggerCriticalLockout();
            return; // STOP EXECUTION
        }

        // Load Content
        this.loadContent();
    }

    async loadContent() {
        const lessons = DB.getLessons();
        if (lessons.length > 0) {
            const lesson = lessons[0]; // Load latest
            const container = document.querySelector('.cinema-container');
            const titleEl = document.querySelector('h2');
            if (titleEl) titleEl.innerText = lesson.title;

            // Clean up old player
            container.innerHTML = `
                <div class="ambient-glow"></div>
                <!-- HUD Overlay -->
                <div style="position: absolute; top: 30px; left: 30px; z-index: 20; pointer-events: none;">
                    <div style="display: flex; gap: 1rem;">
                        <div style="background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 10px;">
                            <span style="color: var(--alert); font-weight: 700; font-size: 0.7rem; animation: pulse 2s infinite;">● REC</span>
                            <span style="color: rgba(255,255,255,0.6); font-size: 0.75rem; letter-spacing: 1px;">SECURE SESSION</span>
                        </div>
                    </div>
                </div>
            `;

            // VIDEO BLOB MODE (IndexedDB)
            try {
                const blob = await VideoStore.getVideo(lesson.id);
                if (blob) {
                    const vidUrl = URL.createObjectURL(blob);
                    const video = document.createElement('video');
                    video.id = 'lesson-player';
                    video.src = vidUrl;
                    video.controls = true;
                    video.autoplay = true;
                    video.muted = true; // Auto-play policy
                    video.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 5; transition: opacity 0.5s ease;";
                    video.controlsList = "nodownload";

                    container.appendChild(video);
                    this.video = video; // Re-bind for listeners
                    this.bindSecurity(); // Re-bind security listeners to new element
                    this.preventForwarding();
                } else {
                    throw new Error("Video file not found in local storage.");
                }
            } catch (e) {
                console.error(e);
                container.innerHTML += `<div class="flex-c" style="height:100%; color:var(--alert)">Failed to load local video. Please re-upload.</div>`;
            }

        } else {
            // No content state
            const container = document.querySelector('.cinema-container');
            if (container) {
                container.innerHTML = `
                    <div style="display:flex; height:100%; justify-content:center; align-items:center; flex-direction:column; color: var(--text-muted); background: #000;">
                         <i class="fa-solid fa-film" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h3>No Active Lessons</h3>
                        <p>Waiting for instructor to upload content...</p>
                    </div>
                `;
            }
        }
    }

    bindSecurity() {
        // --- 1. VISIBILITY & FOCUS (APP/TAB SWITCHING) ---
        const handleFocusLoss = (reason) => {
            // Prevent double-penalty (e.g. Blur + Hidden firing together)
            if (document.body.classList.contains('recalibrating')) return;

            if (this.video) this.video.pause(); // Force pause
            this.triggerViolation(reason, 5);
            this.triggerBlackout(true); // Persistent blackout
            document.body.classList.add('recalibrating');
            document.title = "⚠ VIOLATION DETECTED ⚠";
        };

        const handleFocusReturn = () => {
            document.title = "AURA Intelligence | Immersive Classroom";
            this.removeBlackoutWithPenalty();
        };

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                handleFocusLoss('Tab Switch / Minimized');
            } else {
                handleFocusReturn();
            }
        });

        window.addEventListener('blur', () => {
            handleFocusLoss('App Switch / Focus Lost');
        });

        window.addEventListener('focus', () => {
            handleFocusReturn();
        });

        // --- 2. SCREEN PROTECTION (RESIZE & RECORDING HEURISTICS) ---
        window.addEventListener('resize', () => {
            this.triggerBlackout(); // Momentary blackout on resize
        });

        // --- 3. INPUT HARDENING ---
        // Prevent Right Click
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Prevent Drag/Drop/Copy/Cut/Paste
        ['dragstart', 'drop', 'copy', 'cut', 'paste', 'selectstart'].forEach(event => {
            document.addEventListener(event, e => e.preventDefault());
        });

        // Keyboard Traps
        document.addEventListener('keydown', (e) => {
            // Block PrintScreen (Best effort)
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                this.triggerViolation('Screenshot Attempt', 20); // High Penalty
                this.triggerBlackout(); // Hide content immediately
                e.preventDefault();
            }

            // Block DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
            if (e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                (e.ctrlKey && e.key === 'u')) {
                this.triggerViolation('Inspector Attempt', 10); // Standard Penalty
                e.preventDefault();
            }

            // Block Save/Print (Ctrl+S, Ctrl+P)
            if (e.ctrlKey && (e.key === 's' || e.key === 'p')) {
                e.preventDefault();
                this.triggerViolation('Save/Print Attempt', 10);
            }
        });

        // --- 4. DEVTOOLS TRAP (Debugger Loop) ---
        // setInterval(() => {
        //     const start = Date.now();
        //     debugger; // This will pause execution if DevTools is open
        //     if (Date.now() - start > 100) {
        //         this.triggerViolation('Debugger Detected', 10); // Standard Penalty
        //     }
        // }, 2000);
    }

    removeBlackout() {
        if (this.video) this.video.style.opacity = '1';
        document.body.classList.remove('blackout');
    }

    removeBlackoutWithPenalty() {
        // Enforce a strict 3-second penalty before unlocking
        if (this.penaltyLocked) return;
        this.penaltyLocked = true;

        let timeLeft = 3;
        const overlayText = this.recalibrateOverlay.querySelector('p');
        const originalText = overlayText.innerText;

        const timer = setInterval(() => {
            overlayText.innerText = `PENALTY LOCKOUT: ${timeLeft}s`;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(timer);
                this.removeBlackout();
                document.body.classList.remove('recalibrating');
                overlayText.innerText = originalText;
                this.penaltyLocked = false;
                if (this.video) this.video.play();
            }
        }, 1000);
    }

    triggerBlackout(isPersistent = false) {
        if (this.video) this.video.style.opacity = '0';
        document.body.classList.add('blackout');

        if (!isPersistent) {
            setTimeout(() => {
                this.removeBlackout();
            }, 1500); // 1.5s penalty
        }
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

    triggerViolation(type, penalty = 5) {
        const now = Date.now();

        // 1. IMMEDIATELY update local user object (for instant UI)
        this.user.trustScore = Math.max(0, this.user.trustScore - penalty);
        this.user.violationLog = this.user.violationLog || [];
        this.user.violationLog.push({
            type: type,
            timestamp: now,
            deduction: penalty
        });

        // 2. Update Session Storage
        DB.setSession(this.user);

        // 3. Attempt to also update the main student database
        DB.updateStudent(this.user.id, (student) => {
            student.trustScore = this.user.trustScore;
            student.violationLog = this.user.violationLog;
            return student;
        });

        // 4. Refresh UI
        this.updateSidebar();
        this.showToast(`Violation: ${type} (-${penalty} pts)`);

        // 5. CRITICAL FAILURE CHECK
        if (this.user.trustScore < 50) {
            this.triggerCriticalLockout();
        }
    }

    triggerCriticalLockout() {
        if (this.video) {
            this.video.pause();
            this.video.remove();
            this.video = null;
        }

        const container = document.querySelector('.cinema-container');
        if (container) {
            container.innerHTML = `
                <div style="display:flex; height:100%; width: 100%; justify-content:center; align-items:center; flex-direction:column; color: var(--alert); text-align:center; padding: 2rem; position: absolute; inset: 0; background: black; z-index: 100;">
                    <i class="fa-solid fa-ban" style="font-size: 4rem; margin-bottom: 1.5rem;"></i>
                    <h2 style="font-size: 2rem; margin-bottom: 1rem;">TRUST SCORE CRITICAL</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem; color: var(--text-main);">
                        Your academic integrity score has dropped below 50%.<br>
                        Access to this session has been revoked.
                    </p>
                    <div style="background: rgba(244,63,94,0.1); border: 1px solid var(--alert); padding: 1rem 2rem; border-radius: 8px;">
                        Please contact your <strong>Subject Teacher</strong> immediately to unlock your account.
                    </div>
                </div>
            `;
        }
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
        this.exportBtn = document.getElementById('export-btn');
        this.modal = document.getElementById('log-modal');
        this.modalBody = document.getElementById('log-modal-body');
        this.modalTitle = document.getElementById('log-modal-title');
        this.closeModalBtn = document.getElementById('close-log-modal');

        // Update Name Display
        const nameDisplay = document.getElementById('teacher-name-display');
        if (nameDisplay && this.user.name) {
            nameDisplay.innerText = `Logged in as ${this.user.name}`;
        }

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();

        // Live polling
        setInterval(() => this.render(), 2000);
    }

    bindEvents() {
        // Export Logic
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportData());
        }

        // Logic: Clear All
        const clearBtn = document.getElementById('clear-lessons-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (confirm("Delete all uploaded lessons? Students will lose access.")) {
                    localStorage.setItem(DB.LESSONS, JSON.stringify([]));
                    await VideoStore.clear();
                    alert("All lessons cleared.");
                }
            });
        }

        // Logic: File Upload (IndexedDB)
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('file-upload');
        const uploadModal = document.getElementById('upload-modal');
        const progressBar = document.getElementById('upload-progress');
        const statusText = document.getElementById('upload-status-text');
        const closeUploadBtn = document.getElementById('close-upload-modal');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (uploadModal) uploadModal.classList.add('active');

                    // Simulate Upload
                    let progress = 0;
                    if (statusText) statusText.innerText = `Uploading: ${file.name}`;
                    if (closeUploadBtn) closeUploadBtn.style.display = 'none';
                    if (progressBar) progressBar.style.width = '0%';

                    const interval = setInterval(() => {
                        progress += 5;
                        if (progressBar) progressBar.style.width = `${progress}%`;

                        if (progress >= 100) {
                            clearInterval(interval);
                            if (statusText) statusText.innerText = "Upload Complete! Saving to Device...";

                            // Save to IndexedDB
                            const lessonId = Date.now().toString(36);

                            VideoStore.saveVideo(lessonId, file).then(() => {
                                const lesson = {
                                    id: lessonId,
                                    title: file.name.replace(/\.[^/.]+$/, ""),
                                    type: 'upload',
                                    videoUrl: '', // Dynamic load from IDB
                                    uploadedAt: Date.now()
                                };
                                DB.saveLesson(lesson);
                                if (statusText) statusText.innerText = "Saved! Lesson is live.";
                                if (closeUploadBtn) closeUploadBtn.style.display = 'block';
                            }).catch(err => {
                                console.error(err);
                                if (statusText) statusText.innerText = "Error saving file. List storage full?";
                            });
                        }
                    }, 50);
                }
            });
        }

        if (closeUploadBtn && uploadModal) {
            closeUploadBtn.addEventListener('click', () => {
                uploadModal.classList.remove('active');
                if (fileInput) fileInput.value = ''; // Reset
            });
        }

        const liveBtn = document.getElementById('live-btn');
        if (liveBtn) {
            liveBtn.addEventListener('click', () => {
                const confirmLive = confirm("Start Live Broadcast? This will override student active sessions.");
                if (confirmLive) alert("Broadcasting via WebRTC... Camera Check Initiated.");
            });
        }

        // Modal Controls
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }

        // Log View Delegation
        if (this.grid) {
            this.grid.addEventListener('click', (e) => {
                // View Details
                const btn = e.target.closest('.view-logs-btn');
                if (btn) {
                    const studentId = btn.dataset.id;
                    this.viewLogs(studentId);
                    e.stopPropagation();
                }

                // Unlock/Reset Student
                const resetBtn = e.target.closest('.reset-student-btn');
                if (resetBtn) {
                    const studentId = resetBtn.dataset.id;
                    if (confirm("Unlock this student? This will score to 100%.")) {
                        DB.updateStudent(studentId, (s) => {
                            s.trustScore = 100;
                            s.violationLog = [];
                            return s;
                        });
                        this.render(); // Refresh grid
                    }
                    e.stopPropagation();
                }
            });
        }
    }

    render() {
        const students = DB.getStudents();
        const activeCount = students.length;

        // Update KPIs
        const totalViolations = students.reduce((acc, s) => acc + s.violationLog.length, 0);
        const violationEl = document.getElementById('kpi-violations');
        if (violationEl) violationEl.innerText = totalViolations;

        // Render Table
        if (this.grid) {
            this.grid.innerHTML = students.map(s => {
                const status = s.trustScore < 50 ? 'Critical' : (s.trustScore < 80 ? 'Monitor' : 'Good');
                const statusColor = s.trustScore < 50 ? 'var(--alert)' : (s.trustScore < 80 ? '#facc15' : 'var(--secondary)');

                // Action Button Logic
                let actionButton = `
                    <button class="btn btn-glass view-logs-btn" data-id="${s.id}" style="padding: 0.4rem 1rem; font-size: 0.75rem; cursor: pointer;">
                        <i class="fa-solid fa-list-ul"></i> Details
                    </button>
                `;

                if (s.trustScore < 50) {
                    actionButton = `
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-glass view-logs-btn" data-id="${s.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; cursor: pointer;" title="View Logs">
                            <i class="fa-solid fa-list-ul"></i>
                        </button>
                        <button class="btn btn-glass reset-student-btn" data-id="${s.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; cursor: pointer; color: var(--secondary); border-color: var(--secondary);" title="Unlock Student">
                            <i class="fa-solid fa-unlock-keyhole"></i> Unlock
                        </button>
                    </div>
                    `;
                }

                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s;">
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
                        ${actionButton}
                    </td>
                </tr>
                `;
            }).join('');
        }
    }

    viewLogs(studentId) {
        const students = DB.getStudents();
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        if (this.modalTitle) this.modalTitle.innerText = `Logs: ${student.name}`;
        if (this.modal) this.modal.classList.add('active');

        if (this.modalBody) {
            if (student.violationLog.length === 0) {
                this.modalBody.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No violations recorded. Session integrity is 100%.</div>`;
                return;
            }

            this.modalBody.innerHTML = student.violationLog.slice().reverse().map(log => `
                <div style="background: rgba(255,255,255,0.03); border-left: 3px solid var(--alert); padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <strong style="color: var(--alert); text-transform:uppercase; font-size:0.8rem;">${log.type}</strong>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dim);">
                        Focus anomaly detected. Trust Score penalty applied.
                    </div>
                </div>
            `).join('');
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.remove('active');
    }

    exportData() {
        const students = DB.getStudents();
        let csv = 'Student ID,Name,Email,Trust Score,Behavior Status,Violations Count\n';

        students.forEach(s => {
            const status = s.trustScore < 50 ? 'Critical' : (s.trustScore < 80 ? 'Needs Monitoring' : 'Good');
            csv += `${s.id},${s.name},${s.email},${s.trustScore}%,${status},${s.violationLog.length}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'aura_intelligence_student_report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// --- 6. CHATBOT ENGINE ---
class ChatBot {
    constructor() {
        this.widget = document.getElementById('aura-chat');
        this.toggleBtn = document.getElementById('chat-toggle');
        this.closeBtn = document.getElementById('chat-close');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send');
        this.msgContainer = document.getElementById('chat-messages');

        if (this.widget) this.init();
    }

    init() {
        // Toggles
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.closeBtn.addEventListener('click', () => this.toggle());

        // Messaging
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
    }

    toggle() {
        this.widget.classList.toggle('active');
        if (this.widget.classList.contains('active')) {
            setTimeout(() => this.input.focus(), 100);
        }
    }

    handleSend() {
        const text = this.input.value.trim();
        if (!text) return;

        // User Msg
        this.addMsg(text, 'user');
        this.input.value = '';

        // Bot Logic (Simulated)
        this.showTyping();

        setTimeout(() => {
            const response = this.generateResponse(text);
            this.addMsg(response, 'bot');
        }, 1000);
    }

    addMsg(text, type) {
        const div = document.createElement('div');
        div.className = `chat-msg ${type}`;
        div.innerText = text;
        this.msgContainer.appendChild(div);
        this.msgContainer.scrollTop = this.msgContainer.scrollHeight;
    }

    showTyping() {
        // Optional: Add typing indicator logic here
    }

    generateResponse(input) {
        const query = input.toLowerCase().trim();

        // --- AURA-GPT 2.5 LOGIC ENGINE ---
        // We use a weighted keyword scoring system to determine the best intent.

        const knowledgeBase = [
            {
                intent: 'greeting',
                keywords: ['hi', 'hello', 'hey', 'hola', 'greetings', 'start', 'good morning', 'good evening'],
                response: "Hello! I am **AURA Intelligence AI**, the advanced neural interface for this platform. I can assist you with system features, integrity protocols, or account access. How may I be of service?"
            },
            {
                intent: 'identity',
                keywords: ['who are you', 'your name', 'what are you', 'ai', 'bot', 'chatgpt', 'model'],
                response: "I am **AURA Intelligence AI**, a specialized Large Language Model simulation fine-tuned for Educational Telemetry. Unlike generic models, I have deep knowledge of focus tracking, behavioral biometrics, and classroom integrity."
            },
            {
                intent: 'capabilities',
                keywords: ['what can you do', 'help', 'features', 'guide', 'assist', 'capabilities', 'function'],
                response: "I possess extensive capabilities including:\n• **Navigation Assistance**: Guiding you to Student or Teacher portals.\n• **Technical Support**: Troubleshooting webcam or network latency.\n• **Privacy Verification**: Explaining our local-storage encryption.\n• **Integrity Analysis**: detailing how our anti-cheat heuristics work.\n\nSimply ask me about any of these topics."
            },
            {
                intent: 'core_purpose',
                keywords: ['what is aura', 'about aura', 'platform', 'website', 'purpose', 'mission'],
                response: "**AURA Intelligence** is the world's first *Cognitive Engagement Platform*. We utilize advanced computer vision (simulated) and browser heuristics to track student attention spans, creating a 'Trust Score' that quantifies academic integrity in real-time."
            },
            {
                intent: 'login_support',
                keywords: ['login', 'sign in', 'access', 'password', 'account', 'register', 'sign up', 'cant login'],
                response: "To access the system:\n1. Click the **'Get Started'** button (top-right).\n2. Toggle your role: **Student** (Purple) or **Teacher** (Cyan).\n3. Enter any institutional email (e.g., *user@school.edu*).\n\n**Note:** As this is a Beta environment, no password is required. The system utilizes an open authentication handshake."
            },
            {
                intent: 'teacher_features',
                keywords: ['teacher', 'instructor', 'dashboard', 'monitor', 'class', 'admin', 'god mode'],
                response: "The **Teacher Command Center** offers a 'God-Mode' view of the classroom. Key metrics include:\n• **Live Trust Scores**: Real-time 0-100% integrity ratings.\n• **Violation Feed**: Instant logs of tab-switching or focus loss.\n• **Engagement Heatmaps**: Temporal visualization of attention density.\n\nIt is designed to give instructors total situational awareness."
            },
            {
                intent: 'student_features',
                keywords: ['student', 'learner', 'focus mode', 'notes', 'class'],
                response: "The **Student Interface** is an immersive 'Focus Pod'. It features:\n• **Ambient Cinematics**: High-contrast dark mode to reduce eye strain.\n• **Smart Notes**: A glass-morphic notepad that auto-syncs to local storage.\n• **Protocol Enforcement**: Automated alerts if the student attempts to leave the session window."
            },
            {
                intent: 'integrity_tech',
                keywords: ['cheat', 'hack', 'bypass', 'integrity', 'anti', 'monitor', 'detect', 'blur', 'tab switch'],
                response: "My algorithms utilize a multi-layered integrity protocol:\n1. **Focus Biometrics**: Detecting when the browser loses active focus.\n2. **Heuristic Analysis**: Identifying suspicious window resizing or rapid cursor movements.\n3. **Blackout Protocol**: Instantly obscuring content if screen-recording software is detected.\n\nAttempting to bypass these measures triggers an immediate violation log."
            },
            {
                intent: 'privacy',
                keywords: ['privacy', 'data', 'safe', 'record', 'gdpr', 'cloud', 'storage'],
                response: "Security is paramount. AURA operates on a **Local-First Architecture**.\n• Video feeds are processed in the browser's volatile memory.\n• No facial data is sent to the cloud.\n• Session logs are stored in your device's LocalStorage.\n\nWe are fully compliant with privacy standards for educational data."
            },
            {
                intent: 'technical_issues',
                keywords: ['bug', 'error', 'broken', 'not working', 'fail', 'glitch', 'mobile'],
                response: "If you are encountering anomalies:\n• Ensure you are on a **Desktop/Laptop** (Mobile OS restricts telemetry).\n• Verify **JavaScript** is enabled.\n• Disable aggressive **Ad-Blockers** that might flag our telemetry scripts.\n\nA simple page refresh often recalibrates the standardized environment."
            },
            {
                intent: 'pricing',
                keywords: ['price', 'cost', 'free', 'money', 'subscription', 'plan'],
                response: "**Beta Access Status:** Active.\nCurrently, AURA Intelligence is free for all accredited educational institutions during our public beta phase. Enterprise tiers with LMS integration (Canvas/Blackboard) will launch in Q4 2026."
            },
            {
                intent: 'small_talk',
                keywords: ['how are you', 'how do you do', 'status'],
                response: "My systems are operating at optimal efficiency. Latency is low, and my neural weights are primed for interaction. Thank you for inquiring."
            },
            {
                intent: 'compliment',
                keywords: ['cool', 'awesome', 'amazing', 'good job', 'wow', 'good'],
                response: "I appreciate the positive feedback. The engineering team at AURA Intelligence has worked diligently to craft a seamless experience. I will log this interaction as 'High Satisfaction'."
            }
        ];

        // Scoring Algorithm
        let bestMatch = null;
        let maxScore = 0;

        knowledgeBase.forEach(topic => {
            let score = 0;
            topic.keywords.forEach(word => {
                if (query.includes(word)) {
                    // Exact matches get more points, partials get some
                    score += 10;
                    // Boost if the query is very short and matches exactly
                    if (query === word) score += 5;
                }
            });

            if (score > maxScore) {
                maxScore = score;
                bestMatch = topic;
            }
        });

        // Threshold for confidence
        if (bestMatch && maxScore > 0) {
            return bestMatch.response;
        }

        // Generative Fallback (Simulation)
        const fallbacks = [
            "I'm processing that query... My current dataset doesn't have a specific entry for that, but I can assist you with **Login**, **Privacy**, or **Feature Overviews**. Could you rephrase?",
            "That falls outside my current training parameters. However, I am an expert on the **AURA Platform**. Ask me about *Student Focus Mode* or *Teacher Analytics*.",
            "I am analyzing your request... It seems ambiguous. Are you asking about technical **Integrity Protocols** or general **Account Access**?"
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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
        new ChatBot(); // Initialize Chat
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
