// ============================================================================
// File Name:    app.js
// Description:  Ultimate version of Strive Habit Tracker PWA.
//               Integrates categories filtering, weekly progress bar target,
//               30-day contribution heatmap, data backup/restore, Web Audio
//               synthesizer, Canvas Confetti engine, themes, and editing.
// ============================================================================

// App State
let habits = [];
let globalStreak = 0;
let currentTheme = 'midnight';
let activeFilter = 'all';

// New States for Features
let activeTimers = {};
let editingNotes = {};
let currentCalendarHabitId = null;
let calendarCurrentDate = new Date();
let soundStyle = 'synth';
let timeBoxingCollapsed = true;

const achievements = [
    { id: 'first_step', name: 'First Step', desc: 'Complete your first habit check-in', icon: 'fa-shoe-prints', badge: 'bronze' },
    { id: 'streak_3', name: 'Consistent Starter', desc: 'Reach a 3-day global streak', icon: 'fa-fire-alt', badge: 'bronze' },
    { id: 'streak_7', name: 'Week Warrior', desc: 'Reach a 7-day global streak', icon: 'fa-calendar-week', badge: 'silver' },
    { id: 'streak_30', name: 'Habit Master', desc: 'Reach a 30-day global streak', icon: 'fa-crown', badge: 'gold' },
    { id: 'timer_complete', name: 'Deep Focus', desc: 'Complete a focused timed session', icon: 'fa-brain', badge: 'silver' },
    { id: 'note_taken', name: 'Mindful Logger', desc: 'Add a reflection note to a completion', icon: 'fa-pen-clip', badge: 'bronze' },
    { id: 'perfect_day', name: 'Perfect Day', desc: 'Complete 100% of habits in a single day', icon: 'fa-star', badge: 'gold' },
    { id: 'super_striver', name: 'Super Striver', desc: 'Reach 50 total completions', icon: 'fa-award', badge: 'gold' }
];

// Date Helper Functions
const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateToDayName = (dateStr) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return days[date.getDay()];
};

// Gets the dates in the current ISO week (Monday to Sunday)
const getCurrentWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    // Adjust so Monday is 0, Sunday is 6
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return weekDates;
};

// SVG Progress Ring Configuration
const CIRCUMFERENCE = 2 * Math.PI * 42; // r=42 -> ~263.89

// DOM Elements
const currentDateEl = document.getElementById('currentDate');
const streakCountEl = document.getElementById('streakCount');
const progressCircle = document.getElementById('progressCircle');
const progressPercentage = document.getElementById('progressPercentage');
const progressSubtitle = document.getElementById('progressSubtitle');
const weeklyHistoryEl = document.getElementById('weeklyHistory');
const habitListEl = document.getElementById('habitList');
const emptyStateEl = document.getElementById('emptyState');
const habitCountEl = document.getElementById('habitCount');

// Theme & Stats & Filter Tabs
const themeToggleBtn = document.getElementById('themeToggleBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');
const analyticsPanel = document.getElementById('analyticsPanel');
const filterTabsEl = document.getElementById('filterTabs');

// Analytics DOM Elements
const statCompletionsEl = document.getElementById('statCompletions');
const statBestStreakEl = document.getElementById('statBestStreak');
const statAvgRateEl = document.getElementById('statAvgRate');
const habitBreakdownEl = document.getElementById('habitBreakdown');
const heatmapGridEl = document.getElementById('heatmapGrid');

// Sync / Backup elements
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

// Modal Elements
const modalOverlay = document.getElementById('modalOverlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const habitForm = document.getElementById('habitForm');
const habitNameInput = document.getElementById('habitName');
const habitCategorySelect = document.getElementById('habitCategory');
const habitTargetSelect = document.getElementById('habitTarget');
const emojiSelector = document.getElementById('emojiSelector');
const colorSelector = document.getElementById('colorSelector');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');
const editHabitIdInput = document.getElementById('editHabitId');

// Confetti Canvas Elements
const confettiCanvas = document.getElementById('confettiCanvas');
const ctx = confettiCanvas.getContext('2d');

// State Selectors for Modal form
let selectedEmoji = '💻';
let selectedColor = 'purple';
let isEditMode = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set current formatted date
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);

    // SVG Initialization
    progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    progressCircle.style.strokeDashoffset = CIRCUMFERENCE;

    // Load from LocalStorage
    loadData();

    // Render UI
    updateUI();

    // Event Listeners
    setupEventListeners();
    setupConfettiResize();
});

// Load data from LocalStorage
const loadData = () => {
    const savedHabits = localStorage.getItem('strive_habits');
    const savedStreak = localStorage.getItem('strive_global_streak');
    const lastAccessDate = localStorage.getItem('strive_last_access');
    const savedTheme = localStorage.getItem('strive_theme');
    const today = getTodayDateString();

    if (savedHabits) {
        habits = JSON.parse(savedHabits);
    } else {
        // Seed default habits (with category and target fields added)
        habits = [
            {
                id: '1',
                name: 'Code 30 minutes',
                emoji: '💻',
                color: 'purple',
                category: 'work',
                target: 5,
                streak: 0,
                lastCompleted: '',
                history: []
            },
            {
                id: '2',
                name: 'Drink Water',
                emoji: '💧',
                color: 'blue',
                category: 'health',
                target: 7,
                streak: 0,
                lastCompleted: '',
                history: []
            }
        ];
        saveData();
    }

    if (savedStreak) {
        globalStreak = parseInt(savedStreak, 10);
    }

    if (savedTheme) {
        currentTheme = savedTheme;
    }
    applyTheme(currentTheme);

    // Load next level settings
    const savedSound = localStorage.getItem('strive_sound_style');
    if (savedSound) {
        soundStyle = savedSound;
    }
    const savedCollapsed = localStorage.getItem('strive_timeboxing_collapsed');
    if (savedCollapsed) {
        timeBoxingCollapsed = savedCollapsed === 'true';
    }

    const gridEl = document.getElementById('timeBoxingGrid');
    const chevronEl = document.getElementById('timeBoxingChevron');
    if (gridEl) gridEl.style.display = timeBoxingCollapsed ? 'none' : 'grid';
    if (chevronEl && !timeBoxingCollapsed) chevronEl.classList.add('rotate');
    
    // Set active class on sound options dropdown
    document.querySelectorAll('.sound-option').forEach(el => {
        if (el.getAttribute('data-sound') === soundStyle) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Check for streak reset
    if (lastAccessDate && lastAccessDate !== today && lastAccessDate !== getYesterdayDateString()) {
        globalStreak = 0;
        localStorage.setItem('strive_global_streak', '0');
    }
    
    // Check individual streaks
    habits.forEach(h => {
        // Ensure default properties exist for older data compatibility
        if (!h.category) h.category = 'work';
        if (!h.target) h.target = 7;
        if (h.timerEnabled === undefined) h.timerEnabled = false;
        if (h.timerDuration === undefined) h.timerDuration = 25;
        if (h.timeSlot === undefined) h.timeSlot = 'any';
        if (!h.notes) h.notes = {};
        
        if (h.lastCompleted && h.lastCompleted !== today && h.lastCompleted !== getYesterdayDateString()) {
            h.streak = 0;
        }
    });

    localStorage.setItem('strive_last_access', today);
    saveData();
};

// Save data to LocalStorage
const saveData = () => {
    localStorage.setItem('strive_habits', JSON.stringify(habits));
    localStorage.setItem('strive_global_streak', String(globalStreak));
    localStorage.setItem('strive_theme', currentTheme);
    localStorage.setItem('strive_sound_style', soundStyle);
    localStorage.setItem('strive_timeboxing_collapsed', String(timeBoxingCollapsed));
};

// Apply visual themes and update SVG gradients
const applyTheme = (theme) => {
    document.body.className = `theme-${theme}`;
    currentTheme = theme;
    
    // Update SVG progress ring gradient stops dynamically
    const stop1 = document.getElementById('gradStop1');
    const stop2 = document.getElementById('gradStop2');
    
    if (theme === 'midnight') {
        stop1.setAttribute('stop-color', '#a855f7');
        stop2.setAttribute('stop-color', '#06b6d4');
    } else if (theme === 'cyberpunk') {
        stop1.setAttribute('stop-color', '#f97316');
        stop2.setAttribute('stop-color', '#eab308');
    } else if (theme === 'emerald') {
        stop1.setAttribute('stop-color', '#10b981');
        stop2.setAttribute('stop-color', '#84cc16');
    }
};

// Set up UI component updates
const updateUI = () => {
    renderHabitList();
    renderWeeklySummary();
    updateProgressRing();
    updateAnalytics();
    renderHeatmap();
    renderTimeBoxingSchedule();
    renderWeeklyChart();
    streakCountEl.textContent = globalStreak;
};

// Render the list of habits (filtered by active category tab)
const renderHabitList = () => {
    habitListEl.innerHTML = '';
    const today = getTodayDateString();
    const currentWeekDates = getCurrentWeekDates();

    // Filter habits based on selected category tab
    const filteredHabits = habits.filter(h => activeFilter === 'all' || h.category === activeFilter);

    if (filteredHabits.length === 0) {
        emptyStateEl.style.display = 'flex';
        habitCountEl.textContent = '0 active';
        return;
    } else {
        emptyStateEl.style.display = 'none';
    }

    habitCountEl.textContent = `${filteredHabits.length} active`;

    filteredHabits.forEach(h => {
        const isCompletedToday = (h.lastCompleted === today);

        // Calculate completions in current week
        const completionsThisWeek = h.history.filter(d => currentWeekDates.includes(d)).length;
        const targetRate = Math.round((completionsThisWeek / h.target) * 100);
        const cappedRate = Math.min(100, targetRate);

        // Calculate habit health status
        const healthStatus = calculateHabitHealth(h);
        let healthHTML = '';
        if (healthStatus === 'fire') {
            healthHTML = `<span class="health-badge health-fire" title="On Fire: 5+ day streak!"><i class="fa-solid fa-fire"></i> Fire</span>`;
        } else if (healthStatus === 'consistent') {
            healthHTML = `<span class="health-badge health-lightning" title="Consistent: Active routines!"><i class="fa-solid fa-bolt"></i> Active</span>`;
        } else if (healthStatus === 'cold') {
            healthHTML = `<span class="health-badge health-cold" title="Cold: No check-ins in last 7 days."><i class="fa-regular fa-snowflake"></i> Cold</span>`;
        } else {
            healthHTML = `<span class="health-badge health-leaf" title="Steady pace."><i class="fa-solid fa-leaf"></i> Steady</span>`;
        }

        const card = document.createElement('div');
        card.className = `habit-card color-${h.color} ${isCompletedToday ? 'completed' : ''}`;

        // Prepare timer UI if timer is enabled
        let timerHTML = '';
        if (h.timerEnabled && !isCompletedToday) {
            const timerState = activeTimers[h.id] || { timeLeft: h.timerDuration * 60, running: false };
            const minutes = Math.floor(timerState.timeLeft / 60);
            const seconds = timerState.timeLeft % 60;
            const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            const playIcon = timerState.running ? 'fa-pause' : 'fa-play';
            const playTitle = timerState.running ? 'Pause Timer' : 'Start Timer';

            timerHTML = `
                <div class="habit-timer-container" onclick="event.stopPropagation();">
                    <span class="timer-digits" id="timer-digits-${h.id}">${timeDisplay}</span>
                    <button class="timer-btn" onclick="toggleTimer('${h.id}')" title="${playTitle}">
                        <i class="fa-solid ${playIcon}" id="timer-icon-${h.id}"></i>
                    </button>
                    <button class="timer-btn" onclick="resetTimer('${h.id}')" title="Reset Timer">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                    </button>
                </div>
            `;
        }

        // Prepare reflection note UI if completed today
        let noteHTML = '';
        if (isCompletedToday) {
            h.notes = h.notes || {};
            const savedNote = h.notes[today] || '';
            const isEditing = editingNotes[h.id];

            if (isEditing || !savedNote) {
                noteHTML = `
                    <div class="habit-note-container" onclick="event.stopPropagation();">
                        <div class="note-input-wrapper">
                            <textarea class="habit-note-input" id="note-input-${h.id}" placeholder="How did it go? (auto-saves on blur)" onblur="saveHabitNote('${h.id}', this.value)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){this.blur();event.preventDefault();}">${savedNote}</textarea>
                        </div>
                    </div>
                `;
            } else {
                noteHTML = `
                    <div class="habit-note-container" onclick="event.stopPropagation();">
                        <div class="habit-reflection-text">
                            <span>"${savedNote}"</span>
                            <button class="edit-reflection-btn" onclick="editHabitNote('${h.id}')" title="Edit Reflection">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        card.innerHTML = `
            <div class="habit-card-row">
                <div class="habit-left" onclick="toggleHabit('${h.id}')" style="cursor: pointer;">
                    <div class="check-btn">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <div class="habit-emoji">${h.emoji}</div>
                    <div class="habit-details">
                        <h3>${h.name}</h3>
                        <div class="habit-stats">
                            <div class="habit-stats-row">
                                <span><i class="fa-solid fa-fire"></i> ${h.streak} day streak</span>
                                ${healthHTML}
                            </div>
                            <!-- Weekly Goal Progress Bar -->
                            <div class="weekly-progress-container">
                                <span class="weekly-text">Weekly: ${completionsThisWeek}/${h.target} days</span>
                                <div class="weekly-bar-bg">
                                    <div class="weekly-bar-fill" style="width: ${cappedRate}%; background-color: var(--accent-${h.color});"></div>
                                </div>
                            </div>
                        </div>
                        ${timerHTML}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="calendar-btn edit-btn" onclick="openCalendarModal('${h.id}'); event.stopPropagation();" title="Log History" style="opacity: 1; visibility: visible;">
                        <i class="fa-solid fa-calendar-days"></i>
                    </button>
                    <button class="edit-btn" onclick="openEditModal('${h.id}'); event.stopPropagation();" title="Edit Habit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteHabit('${h.id}'); event.stopPropagation();" title="Delete Habit">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
            ${noteHTML}
        `;
        habitListEl.appendChild(card);
    });
};

// Toggle Habit Completion Status
window.toggleHabit = (id) => {
    const h = habits.find(habit => habit.id === id);
    if (!h) return;

    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    const isCompletedToday = (h.lastCompleted === today);

    const oldCompletedCount = habits.filter(h => h.lastCompleted === today).length;

    if (isCompletedToday) {
        h.lastCompleted = h.history.length > 1 ? h.history[h.history.length - 2] : '';
        h.history = h.history.filter(d => d !== today);
        
        if (h.history.includes(yesterday)) {
            h.streak = calculateHistoryStreak(h.history);
        } else {
            h.streak = 0;
        }
    } else {
        h.history.push(today);
        h.lastCompleted = today;
        
        playCompletionSound();
        h.streak = calculateHistoryStreak(h.history);
    }

    recalculateGlobalStreak();
    saveData();
    updateUI();

    const newCompletedCount = habits.filter(h => h.lastCompleted === today).length;
    if (newCompletedCount === habits.length && oldCompletedCount !== habits.length) {
        startConfetti();
    }
};

// Web Audio API chord synthesizer with custom themes
const playCompletionSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const audioCtx = new AudioContext();
        const now = audioCtx.currentTime;

        if (soundStyle === 'synth') {
            // Cyber Synth (Arpeggiated Sine Chord)
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const startTime = now + (idx * 0.08);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.6);
            });
        } else if (soundStyle === 'zen') {
            // Zen Tibetan Bowl (Deep modulated sine wave with high bell chime harmonics)
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = 'sine';
            osc1.frequency.value = 180; // deep calming base
            
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
            
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.value = 540; // harmonic multiplier (180 * 3)
            
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.15, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
            
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfo.frequency.value = 6; // 6Hz vibration
            lfoGain.gain.value = 15; // pitch modulation range
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc1.frequency);
            
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            
            lfo.start(now);
            osc1.start(now);
            osc2.start(now);
            
            lfo.stop(now + 2.0);
            osc1.stop(now + 2.0);
            osc2.stop(now + 2.0);
        } else if (soundStyle === 'bird') {
            // Forest Bird Chirp (Double pitch-sweeping sine whistles)
            const chirps = [0, 0.15];
            chirps.forEach((delay) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                
                const startTime = now + delay;
                osc.frequency.setValueAtTime(2500, startTime);
                osc.frequency.exponentialRampToValueAtTime(4200, startTime + 0.08);
                osc.frequency.exponentialRampToValueAtTime(3200, startTime + 0.12);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.12);
            });
        } else if (soundStyle === 'retro') {
            // Retro 8-bit Arcade Sound (Square wave slide)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(600, now + 0.08);
            osc.frequency.setValueAtTime(1000, now + 0.16);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        }
    } catch (e) {
        console.warn('AudioContext playback error', e);
    }
};

// Compute consecutive days streak
const calculateHistoryStreak = (history) => {
    if (history.length === 0) return 0;
    const sorted = [...new Set(history)].sort();
    let streak = 0;
    let checkDate = new Date();
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    if (!sorted.includes(todayStr) && !sorted.includes(yesterdayStr)) {
        return 0;
    }

    if (sorted.includes(todayStr)) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
    } else if (sorted.includes(yesterdayStr)) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 2);
    }

    while (true) {
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (sorted.includes(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
};

// Recalculate global streak
const recalculateGlobalStreak = () => {
    const allDates = [];
    habits.forEach(h => {
        h.history.forEach(d => allDates.push(d));
    });
    
    globalStreak = calculateHistoryStreak(allDates);
};

// Delete Habit
window.deleteHabit = (id) => {
    if (confirm('Are you sure you want to delete this habit?')) {
        habits = habits.filter(h => h.id !== id);
        recalculateGlobalStreak();
        saveData();
        updateUI();
    }
};

// Edit Habit Modal Opening
window.openEditModal = (id) => {
    const h = habits.find(habit => habit.id === id);
    if (!h) return;

    isEditMode = true;
    editHabitIdInput.value = h.id;
    habitNameInput.value = h.name;
    habitCategorySelect.value = h.category || 'work';
    habitTargetSelect.value = h.target || 7;
    selectedEmoji = h.emoji;
    selectedColor = h.color;

    // Focus timer settings
    const timerEnabledInput = document.getElementById('habitTimerEnabled');
    const timerDurationSelect = document.getElementById('habitTimerDuration');
    const timerDurationGroup = document.getElementById('timerDurationGroup');

    timerEnabledInput.checked = h.timerEnabled || false;
    timerDurationSelect.value = h.timerDuration || 25;
    timerDurationGroup.style.display = h.timerEnabled ? 'block' : 'none';

    // Time schedule slot setting
    document.getElementById('habitTimeSlot').value = h.timeSlot || 'any';

    document.querySelectorAll('.emoji-option').forEach(el => {
        if (el.getAttribute('data-emoji') === h.emoji) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    document.querySelectorAll('.color-option').forEach(el => {
        if (el.getAttribute('data-color') === h.color) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    modalTitle.textContent = "Edit Habit";
    submitBtn.textContent = "Save Changes";
    modalOverlay.classList.add('active');
};

// Render progress indicators for the last 7 calendar days
const renderWeeklySummary = () => {
    weeklyHistoryEl.innerHTML = '';
    const today = new Date();
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        last7Days.push(d);
    }

    last7Days.forEach(d => {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayLabel = formatDateToDayName(dateStr).substring(0, 1);
        const isToday = (dateStr === getTodayDateString());
        
        const completedOnDay = habits.some(h => h.history.includes(dateStr));

        const dot = document.createElement('div');
        dot.className = `day-dot ${completedOnDay ? 'completed' : ''} ${isToday ? 'today' : ''}`;
        dot.innerHTML = `<span>${dayLabel}</span>`;
        dot.setAttribute('title', `${dateStr} ${completedOnDay ? '(Done)' : '(No activity)'}`);
        weeklyHistoryEl.appendChild(dot);
    });
};

// Update circular progress gauge
const updateProgressRing = () => {
    const today = getTodayDateString();
    if (habits.length === 0) {
        setProgress(0);
        progressPercentage.textContent = '0%';
        progressSubtitle.textContent = 'Add a habit to start!';
        return;
    }

    const completedTodayCount = habits.filter(h => h.lastCompleted === today).length;
    const percentage = Math.round((completedTodayCount / habits.length) * 100);

    setProgress(percentage);
    progressPercentage.textContent = `${percentage}%`;

    if (percentage === 100) {
        progressSubtitle.textContent = 'Perfect day! All habits completed. 🎉';
    } else if (percentage > 0) {
        progressSubtitle.textContent = `${completedTodayCount} of ${habits.length} habits completed today. Keep going!`;
    } else {
        progressSubtitle.textContent = 'No habits completed today yet. You can do it!';
    }
};

const setProgress = (percent) => {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
};

// Calculate and render analytics dashboard stats
const updateAnalytics = () => {
    if (habits.length === 0) {
        statCompletionsEl.textContent = '0';
        statBestStreakEl.textContent = '0';
        statAvgRateEl.textContent = '0%';
        habitBreakdownEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 13px;">No stats available yet.</p>';
        renderAchievements();
        renderJourneyTimeline();
        return;
    }

    // 1. Total completions across all habits
    let totalCompletions = 0;
    habits.forEach(h => totalCompletions += h.history.length);
    statCompletionsEl.textContent = totalCompletions;

    // 2. Best individual streak
    let bestStreak = 0;
    habits.forEach(h => {
        if (h.streak > bestStreak) bestStreak = h.streak;
    });
    statBestStreakEl.textContent = bestStreak;

    // 3. Average consistency success rate over the last 30 days
    const totalPossibleSessions = habits.length * 30;
    let actualCompletionsLast30Days = 0;
    
    const last30Dates = [];
    const checkDate = new Date();
    for (let i = 0; i < 30; i++) {
        const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        last30Dates.push(dStr);
        checkDate.setDate(checkDate.getDate() - 1);
    }

    habits.forEach(h => {
        h.history.forEach(d => {
            if (last30Dates.includes(d)) {
                actualCompletionsLast30Days++;
            }
        });
    });

    const successRate = totalPossibleSessions > 0 ? Math.round((actualCompletionsLast30Days / totalPossibleSessions) * 100) : 0;
    statAvgRateEl.textContent = `${successRate}%`;

    // 4. Render individual breakdown progress bars
    habitBreakdownEl.innerHTML = '';
    habits.forEach(h => {
        const habitRate = h.history.length > 0 ? Math.round((h.history.length / 30) * 100) : 0;
        const cappedRate = Math.min(100, habitRate);
        
        const row = document.createElement('div');
        row.className = 'breakdown-row';
        row.innerHTML = `
            <div class="breakdown-header">
                <span>${h.emoji} ${h.name}</span>
                <span>${h.history.length} done (Last 30d: ${cappedRate}%)</span>
            </div>
            <div class="breakdown-bar-bg">
                <div class="breakdown-bar-fill" style="width: ${cappedRate}%; background-color: var(--accent-${h.color});"></div>
            </div>
        `;
        habitBreakdownEl.appendChild(row);
    });

    renderAchievements();
    renderJourneyTimeline();
};

// Render GitHub style Heatmap Grid (30 days)
const renderHeatmap = () => {
    heatmapGridEl.innerHTML = '';
    
    // Generate dates for the last 30 days (older to newer)
    const dates = [];
    const todayObj = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(todayObj.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    dates.forEach(dateStr => {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        // Count how many habits completed on this date
        const completedCount = habits.filter(h => h.history.includes(dateStr)).length;
        
        // Determine completion level
        if (habits.length > 0 && completedCount > 0) {
            const completionRate = completedCount / habits.length;
            if (completionRate === 1.0) {
                cell.classList.add('level-3'); // 100%
            } else if (completionRate >= 0.5) {
                cell.classList.add('level-2'); // 50% - 99%
            } else {
                cell.classList.add('level-1'); // 1% - 49%
            }
        }
        
        // Add detailed tooltip
        cell.setAttribute('title', `${dateStr}: ${completedCount}/${habits.length} habits completed`);
        heatmapGridEl.appendChild(cell);
    });
};

// Export local data to JSON file
const exportData = () => {
    const dataStr = JSON.stringify({
        habits: habits,
        globalStreak: globalStreak,
        currentTheme: currentTheme
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `strive_habits_backup_${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Import backup JSON file
const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported && Array.isArray(imported.habits)) {
                habits = imported.habits;
                globalStreak = typeof imported.globalStreak === 'number' ? imported.globalStreak : 0;
                currentTheme = imported.currentTheme || 'midnight';
                
                // Save and load
                saveData();
                applyTheme(currentTheme);
                updateUI();
                alert('App data successfully restored!');
            } else {
                alert('Invalid backup file structure.');
            }
        } catch (err) {
            alert('Failed to parse JSON file.');
            console.error(err);
        }
    };
    reader.readAsText(file);
};

// Event Listeners Configuration
const setupEventListeners = () => {
    // Open Modal
    openModalBtn.addEventListener('click', () => {
        isEditMode = false;
        modalTitle.textContent = "Create New Habit";
        submitBtn.textContent = "Save Habit";
        editHabitIdInput.value = "";
        modalOverlay.classList.add('active');
        habitNameInput.focus();
    });

    // Close Modal
    closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
        resetForm();
    });

    // Background Click to Close
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
            resetForm();
        }
    });

    // Emoji Selection
    emojiSelector.addEventListener('click', (e) => {
        const option = e.target.closest('.emoji-option');
        if (!option) return;
        
        document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
        option.classList.add('selected');
        selectedEmoji = option.getAttribute('data-emoji');
    });

    // Color Selection
    colorSelector.addEventListener('click', (e) => {
        const option = e.target.closest('.color-option');
        if (!option) return;
        
        document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
        option.classList.add('selected');
        selectedColor = option.getAttribute('data-color');
    });

    // Handle Form Submit (Add or Edit)
    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = habitNameInput.value.trim();
        const category = habitCategorySelect.value;
        const target = parseInt(habitTargetSelect.value, 10);
        const timerEnabled = document.getElementById('habitTimerEnabled').checked;
        const timerDuration = parseInt(document.getElementById('habitTimerDuration').value, 10);
        const timeSlot = document.getElementById('habitTimeSlot').value;
        
        if (!name) return;

        if (isEditMode) {
            const id = editHabitIdInput.value;
            const h = habits.find(habit => habit.id === id);
            if (h) {
                h.name = name;
                h.emoji = selectedEmoji;
                h.color = selectedColor;
                h.category = category;
                h.target = target;
                h.timerEnabled = timerEnabled;
                h.timerDuration = timerDuration;
                h.timeSlot = timeSlot;
            }
        } else {
            const newHabit = {
                id: Date.now().toString(),
                name: name,
                emoji: selectedEmoji,
                color: selectedColor,
                category: category,
                target: target,
                streak: 0,
                lastCompleted: '',
                history: [],
                timerEnabled: timerEnabled,
                timerDuration: timerDuration,
                timeSlot: timeSlot,
                notes: {}
            };
            habits.push(newHabit);
        }

        saveData();
        updateUI();
        
        modalOverlay.classList.remove('active');
        resetForm();
    });

    // Category Tabs Filter Navigation
    filterTabsEl.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;

        document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.getAttribute('data-filter');
        
        // Re-render habit list with selected filter applied
        renderHabitList();
    });

    // Expandable Analytics Panel Toggle
    statsToggleBtn.addEventListener('click', () => {
        analyticsPanel.classList.toggle('active');
        statsToggleBtn.classList.toggle('active');
    });

    // Theme Switcher Toggle
    themeToggleBtn.addEventListener('click', () => {
        let nextTheme = 'midnight';
        if (currentTheme === 'midnight') nextTheme = 'cyberpunk';
        else if (currentTheme === 'cyberpunk') nextTheme = 'emerald';
        
        applyTheme(nextTheme);
        saveData();
        updateUI();
    });

    // Export and Import Buttons Event Listeners
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleFileImport);

    // Focus Timer check toggle
    document.getElementById('habitTimerEnabled').addEventListener('change', (e) => {
        document.getElementById('timerDurationGroup').style.display = e.target.checked ? 'block' : 'none';
    });

    // Calendar Modal Controls
    document.getElementById('closeCalendarModalBtn').addEventListener('click', closeCalendarModal);
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        renderCalendar();
    });
    document.getElementById('calendarModalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('calendarModalOverlay')) {
            closeCalendarModal();
        }
    });

    // Sound settings popover toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const soundPopover = document.getElementById('soundPopover');
    soundToggleBtn.addEventListener('click', (e) => {
        soundPopover.classList.toggle('active');
        e.stopPropagation();
    });
    // Hide popover when clicking anywhere else
    document.addEventListener('click', () => {
        soundPopover.classList.remove('active');
    });
    // Prevent hiding popover when clicking inside it
    soundPopover.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    // Handle sound style selection
    soundPopover.addEventListener('click', (e) => {
        const option = e.target.closest('.sound-option');
        if (!option) return;
        
        soundStyle = option.getAttribute('data-sound');
        document.querySelectorAll('.sound-option').forEach(el => el.classList.remove('active'));
        option.classList.add('active');
        
        playCompletionSound(); // Preview play the sound!
        saveData();
    });

    // Time-boxing Schedule Panel Toggle
    const timeBoxingToggleBtn = document.getElementById('timeBoxingToggleBtn');
    const timeBoxingGrid = document.getElementById('timeBoxingGrid');
    const timeBoxingChevron = document.getElementById('timeBoxingChevron');
    timeBoxingToggleBtn.addEventListener('click', () => {
        timeBoxingCollapsed = !timeBoxingCollapsed;
        timeBoxingGrid.style.display = timeBoxingCollapsed ? 'none' : 'grid';
        timeBoxingChevron.classList.toggle('rotate');
        saveData();
    });
};

const resetForm = () => {
    habitForm.reset();
    isEditMode = false;
    editHabitIdInput.value = "";
    habitCategorySelect.value = "work";
    habitTargetSelect.value = "7";
    
    document.getElementById('habitTimerEnabled').checked = false;
    document.getElementById('habitTimerDuration').value = "25";
    document.getElementById('timerDurationGroup').style.display = 'none';
    document.getElementById('habitTimeSlot').value = 'any';

    document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
    const defaultEmoji = document.querySelector('.emoji-option[data-emoji="💻"]');
    defaultEmoji.classList.add('selected');
    selectedEmoji = '💻';

    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    const defaultColor = document.querySelector('.color-option[data-color="purple"]');
    defaultColor.classList.add('selected');
    selectedColor = 'purple';
};

// ============================================================================
// Focus Timer Logic
// ============================================================================
window.toggleTimer = (id) => {
    const h = habits.find(habit => habit.id === id);
    if (!h) return;

    if (!activeTimers[id]) {
        activeTimers[id] = {
            timeLeft: h.timerDuration * 60,
            intervalId: null,
            running: false
        };
    }

    const timer = activeTimers[id];

    if (timer.running) {
        // Pause the timer
        clearInterval(timer.intervalId);
        timer.running = false;
        
        // Update UI button icon instantly
        const btnIcon = document.getElementById(`timer-icon-${id}`);
        if (btnIcon) {
            btnIcon.className = 'fa-solid fa-play';
            btnIcon.closest('.timer-btn').setAttribute('title', 'Start Timer');
        }
    } else {
        // Start the timer
        timer.running = true;
        
        // Update UI button icon instantly
        const btnIcon = document.getElementById(`timer-icon-${id}`);
        if (btnIcon) {
            btnIcon.className = 'fa-solid fa-pause';
            btnIcon.closest('.timer-btn').setAttribute('title', 'Pause Timer');
        }

        timer.intervalId = setInterval(() => {
            timer.timeLeft--;
            
            // Update time display digit
            const digitsEl = document.getElementById(`timer-digits-${id}`);
            if (digitsEl) {
                const minutes = Math.floor(timer.timeLeft / 60);
                const seconds = timer.timeLeft % 60;
                digitsEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            if (timer.timeLeft <= 0) {
                clearInterval(timer.intervalId);
                delete activeTimers[id];
                
                // Set timer completed flag in LocalStorage for achievements
                localStorage.setItem('strive_timer_completed', 'true');
                
                // Toggle completion for the habit
                toggleHabit(id);
                alert(`⏱️ Focus timer complete for "${h.name}"! Habit checked off.`);
            }
        }, 1000);
    }
};

window.resetTimer = (id) => {
    const h = habits.find(habit => habit.id === id);
    if (!h) return;

    if (activeTimers[id]) {
        clearInterval(activeTimers[id].intervalId);
        delete activeTimers[id];
    }
    
    updateUI();
};

// ============================================================================
// Note-Taking / Reflection Log Logic
// ============================================================================
window.editHabitNote = (id) => {
    editingNotes[id] = true;
    renderHabitList();
    const inputEl = document.getElementById(`note-input-${id}`);
    if (inputEl) inputEl.focus();
};

window.saveHabitNote = (id, text) => {
    const h = habits.find(habit => habit.id === id);
    if (!h) return;

    h.notes = h.notes || {};
    const today = getTodayDateString();
    
    if (text.trim() === '') {
        delete h.notes[today];
    } else {
        h.notes[today] = text.trim();
    }

    delete editingNotes[id];
    saveData();
    updateUI();
};

// ============================================================================
// Achievements System Logic
// ============================================================================
const checkPerfectDayHistory = () => {
    if (habits.length === 0) return false;
    
    // Check today
    const today = getTodayDateString();
    const completedToday = habits.filter(h => h.lastCompleted === today).length;
    if (completedToday === habits.length) return true;

    // Check past 30 days
    const todayObj = new Date();
    for (let i = 1; i < 30; i++) {
        const d = new Date();
        d.setDate(todayObj.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const completedOnDate = habits.filter(h => h.history.includes(dateStr)).length;
        if (completedOnDate === habits.length) return true;
    }
    return false;
};

const renderAchievements = () => {
    const achievementsGrid = document.getElementById('achievementsGrid');
    if (!achievementsGrid) return;
    
    achievementsGrid.innerHTML = '';

    // Calculate completions
    let totalCompletions = 0;
    habits.forEach(h => totalCompletions += h.history.length);

    // Calculate timers and notes status
    const timerCompleted = localStorage.getItem('strive_timer_completed') === 'true';
    const noteTaken = habits.some(h => h.notes && Object.values(h.notes).some(v => v.trim() !== ''));
    const perfectDay = checkPerfectDayHistory();

    achievements.forEach(a => {
        let unlocked = false;
        
        switch (a.id) {
            case 'first_step':
                unlocked = totalCompletions > 0;
                break;
            case 'streak_3':
                unlocked = globalStreak >= 3;
                break;
            case 'streak_7':
                unlocked = globalStreak >= 7;
                break;
            case 'streak_30':
                unlocked = globalStreak >= 30;
                break;
            case 'timer_complete':
                unlocked = timerCompleted;
                break;
            case 'note_taken':
                unlocked = noteTaken;
                break;
            case 'perfect_day':
                unlocked = perfectDay;
                break;
            case 'super_striver':
                unlocked = totalCompletions >= 50;
                break;
        }

        const badge = document.createElement('div');
        badge.className = `achievement-badge ${unlocked ? 'unlocked badge-' + a.badge : 'locked'}`;
        badge.setAttribute('title', `${a.name}: ${a.desc} (${unlocked ? 'Unlocked!' : 'Locked'})`);
        badge.innerHTML = `
            <div class="achievement-icon"><i class="fa-solid ${a.icon}"></i></div>
            <span class="achievement-name">${a.name}</span>
        `;
        achievementsGrid.appendChild(badge);
    });
};

// ============================================================================
// Calendar Log History Modal Logic
// ============================================================================
window.openCalendarModal = (id) => {
    const h = habits.find(habit => habit.id === id);
    if (!h) return;

    currentCalendarHabitId = id;
    calendarCurrentDate = new Date(); // Reset to today's month
    
    const titleEl = document.getElementById('calendarModalTitle');
    titleEl.innerHTML = `${h.emoji} Log History: ${h.name}`;
    
    // Set custom coloring class to modal card to style cells appropriately
    const modalOverlay = document.getElementById('calendarModalOverlay');
    const modalCard = modalOverlay.querySelector('.modal-card');
    modalCard.className = `modal-card calendar-modal-card color-${h.color}`;

    renderCalendar();
    modalOverlay.classList.add('active');
};

window.closeCalendarModal = () => {
    const modalOverlay = document.getElementById('calendarModalOverlay');
    modalOverlay.classList.remove('active');
    currentCalendarHabitId = null;
};

window.renderCalendar = () => {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearEl = document.getElementById('calendarMonthYear');
    if (!calendarGrid || !currentCalendarHabitId) return;

    const h = habits.find(habit => habit.id === currentCalendarHabitId);
    if (!h) return;

    calendarGrid.innerHTML = '';

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth(); // 0-indexed

    // Format Month Header Text
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;

    // Get first day of the month and total number of days
    const firstDay = new Date(year, month, 1);
    // Get weekday of first day (adjust so Monday = 0, Sunday = 6)
    let startDayIdx = firstDay.getDay();
    startDayIdx = startDayIdx === 0 ? 6 : startDayIdx - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();

    // Render empty spaces for weekdays preceding the 1st
    for (let i = 0; i < startDayIdx; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell empty';
        calendarGrid.appendChild(emptyCell);
    }

    // Render day cells
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isCompleted = h.history.includes(dateStr);

        const cell = document.createElement('div');
        cell.className = `calendar-day-cell ${isCompleted ? 'completed' : ''}`;
        cell.textContent = day;
        cell.setAttribute('title', `${dateStr} ${isCompleted ? '(Completed)' : '(No record)'}`);
        
        cell.onclick = () => {
            toggleCalendarDate(dateStr);
        };

        calendarGrid.appendChild(cell);
    }
};

window.toggleCalendarDate = (dateStr) => {
    if (!currentCalendarHabitId) return;
    const h = habits.find(habit => habit.id === currentCalendarHabitId);
    if (!h) return;

    const today = getTodayDateString();
    const isCompleted = h.history.includes(dateStr);

    if (isCompleted) {
        // Remove completion record
        h.history = h.history.filter(d => d !== dateStr);
        // Recalculate lastCompleted and streak
        if (h.lastCompleted === dateStr) {
            h.lastCompleted = h.history.length > 0 ? h.history[h.history.length - 1] : '';
        }
    } else {
        // Add completion record
        h.history.push(dateStr);
        h.history.sort(); // Sort chronologically
        
        // Update lastCompleted if this added date is newer
        const newestHistoryDate = h.history[h.history.length - 1];
        if (!h.lastCompleted || newestHistoryDate > h.lastCompleted) {
            h.lastCompleted = newestHistoryDate;
        }
        
        // Play chord synthesizer if adding a completion
        playCompletionSound();
    }

    h.streak = calculateHistoryStreak(h.history);
    recalculateGlobalStreak();
    saveData();
    renderCalendar();
    updateUI();

    // Check if perfect day confetti is needed
    const completedCount = habits.filter(hb => hb.lastCompleted === today).length;
    if (completedCount === habits.length && dateStr === today && !isCompleted) {
        startConfetti();
    }
};

// ============================================================================
// Habit Health Logic
// ============================================================================
const getPast7Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return dates;
};

const calculateHabitHealth = (h) => {
    if (h.streak >= 5) return 'fire';
    
    const past7Dates = getPast7Days();
    const completionsLast7 = h.history.filter(d => past7Dates.includes(d)).length;
    
    if (completionsLast7 >= 3) return 'consistent';
    if (completionsLast7 === 0) return 'cold';
    return 'balanced';
};

// ============================================================================
// Interactive SVG Weekly Performance Chart Logic
// ============================================================================
const renderWeeklyChart = () => {
    const container = document.getElementById('weeklyChartContainer');
    if (!container) return;

    container.innerHTML = '';
    
    // Create tooltip element inside container if it doesn't exist
    let tooltip = container.querySelector('.chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        container.appendChild(tooltip);
    }

    const weekDates = getCurrentWeekDates();
    const maxValue = Math.max(1, habits.length);
    
    // Graph configuration
    const width = 400;
    const height = 150;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 25;
    
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Compute data points
    const points = weekDates.map((dateStr, idx) => {
        const completedCount = habits.filter(h => h.history.includes(dateStr)).length;
        const x = paddingLeft + (idx / 6) * graphWidth;
        const y = height - paddingBottom - (completedCount / maxValue) * graphHeight;
        const dayLabel = formatDateToDayName(dateStr);
        return { x, y, count: completedCount, date: dateStr, dayLabel };
    });

    // Begin SVG Generation
    let svgHTML = `<svg viewBox="0 0 ${width} ${height}" class="svg-chart">`;
    
    // Linear gradients definitions
    svgHTML += `
        <defs>
            <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--accent-purple)" />
                <stop offset="100%" stop-color="var(--accent-cyan)" />
            </linearGradient>
            <linearGradient id="chartFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="var(--accent-purple)" stop-opacity="0.25" />
                <stop offset="100%" stop-color="var(--accent-purple)" stop-opacity="0" />
            </linearGradient>
            <filter id="chartGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="var(--accent-purple)" flood-opacity="0.3" />
            </filter>
        </defs>
    `;

    // 1. Draw Grid Lines
    const gridLevels = [0, 0.5, 1]; // bottom, middle, top
    gridLevels.forEach(level => {
        const yVal = height - paddingBottom - level * graphHeight;
        const countLabel = Math.round(level * maxValue);
        // Grid line path
        svgHTML += `<line x1="${paddingLeft}" y1="${yVal}" x2="${width - paddingRight}" y2="${yVal}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3 3" />`;
        // Left text label
        svgHTML += `<text x="${paddingLeft - 8}" y="${yVal + 3}" fill="var(--text-secondary)" font-size="9" text-anchor="end" font-weight="500">${countLabel}</text>`;
    });

    // 2. Draw Fill Area below the curve
    let fillPath = `M ${points[0].x} ${height - paddingBottom}`;
    points.forEach(p => fillPath += ` L ${p.x} ${p.y}`);
    fillPath += ` L ${points[points.length - 1].x} ${height - paddingBottom} Z`;
    svgHTML += `<path d="${fillPath}" fill="url(#chartFillGrad)" />`;

    // 3. Draw Stroke Line path
    let strokePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        strokePath += ` L ${points[i].x} ${points[i].y}`;
    }
    svgHTML += `<path d="${strokePath}" fill="none" stroke="url(#chartLineGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#chartGlow)" />`;

    // 4. Draw X-axis Labels (Day names)
    points.forEach(p => {
        svgHTML += `<text x="${p.x}" y="${height - 6}" fill="var(--text-secondary)" font-size="9.5" text-anchor="middle" font-weight="600">${p.dayLabel.substring(0, 3)}</text>`;
    });

    // 5. Draw Interactive Nodes/Circles
    points.forEach((p, idx) => {
        svgHTML += `
            <circle 
                cx="${p.x}" 
                cy="${p.y}" 
                r="5" 
                fill="var(--accent-cyan)" 
                stroke="white" 
                stroke-width="2" 
                style="cursor: pointer; transition: transform 0.2s;"
                onmouseover="showChartTooltip(event, '${p.dayLabel}', ${p.count}, ${maxValue})" 
                onmouseout="hideChartTooltip()"
            />
        `;
    });

    svgHTML += `</svg>`;
    
    // Inject SVG
    const svgWrapper = document.createElement('div');
    svgWrapper.innerHTML = svgHTML;
    container.appendChild(svgWrapper.firstChild);
};

window.showChartTooltip = (event, day, count, total) => {
    const container = document.getElementById('weeklyChartContainer');
    const tooltip = container.querySelector('.chart-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = `<strong>${day}</strong>: ${count}/${total} completed`;
    
    // Position tooltip relative to container boundaries
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left + 10;
    const y = event.clientY - rect.top - 35;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.opacity = '1';
};

window.hideChartTooltip = () => {
    const container = document.getElementById('weeklyChartContainer');
    const tooltip = container.querySelector('.chart-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
};

// ============================================================================
// Journey Timeline Milestones Logic
// ============================================================================
const renderJourneyTimeline = () => {
    const timelineEl = document.getElementById('journeyTimeline');
    if (!timelineEl) return;

    timelineEl.innerHTML = '';

    // Calculate completions
    let totalCompletions = 0;
    habits.forEach(h => totalCompletions += h.history.length);

    const milestones = [
        { key: 'total_1', name: 'First Steps', desc: 'Completed 1 habit session', check: () => totalCompletions >= 1 },
        { key: 'total_10', name: 'Routine Builder', desc: 'Completed 10 habit sessions', check: () => totalCompletions >= 10 },
        { key: 'total_25', name: 'Specialist Striver', desc: 'Completed 25 habit sessions', check: () => totalCompletions >= 25 },
        { key: 'streak_7', name: 'Consistent Warrior', desc: 'Reached a 7-day global streak', check: () => globalStreak >= 7 },
        { key: 'total_50', name: 'Daily Champion', desc: 'Completed 50 habit sessions', check: () => totalCompletions >= 50 },
        { key: 'streak_30', name: 'Unstoppable Legend', desc: 'Reached a 30-day global streak', check: () => globalStreak >= 30 }
    ];

    milestones.forEach(m => {
        const unlocked = m.check();
        const item = document.createElement('div');
        item.className = `journey-item ${unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="journey-dot"></div>
            <div class="journey-content">
                <span class="journey-title">${m.name}</span>
                <span class="journey-desc">${m.desc}</span>
            </div>
        `;
        timelineEl.appendChild(item);
    });
};

// ============================================================================
// Daily Time-Boxing Schedule Logic
// ============================================================================
const renderTimeBoxingSchedule = () => {
    const morningList = document.getElementById('morningSlotList');
    const afternoonList = document.getElementById('afternoonSlotList');
    const eveningList = document.getElementById('eveningSlotList');
    if (!morningList || !afternoonList || !eveningList) return;

    morningList.innerHTML = '';
    afternoonList.innerHTML = '';
    eveningList.innerHTML = '';

    const today = getTodayDateString();
    
    // Determine active slot based on current hour
    const currentHour = new Date().getHours();
    let activeSlot = '';
    if (currentHour < 12) activeSlot = 'morning';
    else if (currentHour < 18) activeSlot = 'afternoon';
    else activeSlot = 'evening';

    // Toggle active slot header highlight
    document.querySelectorAll('.time-slot-column').forEach(col => {
        if (col.getAttribute('data-slot') === activeSlot) {
            col.classList.add('active-slot');
        } else {
            col.classList.remove('active-slot');
        }
    });

    const slotHabits = { morning: [], afternoon: [], evening: [] };

    habits.forEach(h => {
        const slot = h.timeSlot || 'any';
        if (slot !== 'any' && slotHabits[slot] !== undefined) {
            slotHabits[slot].push(h);
        }
    });

    // Helper to render lists
    const renderSlotList = (listEl, listHabits, slotKey) => {
        if (listHabits.length === 0) {
            listEl.innerHTML = `<span class="slot-empty-text">No habits scheduled</span>`;
            return;
        }

        listHabits.forEach(h => {
            const isCompleted = (h.lastCompleted === today);
            const isUpNext = (slotKey === activeSlot && !isCompleted);

            const item = document.createElement('div');
            item.className = `slot-habit-item ${isCompleted ? 'completed' : ''} ${isUpNext ? 'up-next' : ''}`;
            item.innerHTML = `
                <span>${h.emoji}</span>
                <span>${h.name}</span>
            `;
            
            // Clicking a slot item toggles the completion
            item.onclick = () => {
                toggleHabit(h.id);
            };

            listEl.appendChild(item);
        });
    };

    renderSlotList(morningList, slotHabits.morning, 'morning');
    renderSlotList(afternoonList, slotHabits.afternoon, 'afternoon');
    renderSlotList(eveningList, slotHabits.evening, 'evening');
};

// ============================================================================
// Canvas Confetti Engine (High performance, runs client-side offline)
// ============================================================================
let confettiParticles = [];
let confettiAnimationId = null;

const setupConfettiResize = () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    });
};

const startConfetti = () => {
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiParticles = [];

    const colors = ['#a855f7', '#06b6d4', '#10b981', '#f97316', '#ec4899', '#3b82f6'];

    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * confettiCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0
        });
    }

    animateConfetti();
};

const animateConfetti = () => {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    let activeParticles = 0;

    confettiParticles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        if (p.y < confettiCanvas.height) {
            activeParticles++;
        }
    });

    if (activeParticles > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
};
