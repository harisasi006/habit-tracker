// ============================================================================
// File Name:    app.js
// Description:  Upgraded logic for Strive Habit Tracker PWA.
//               Integrates Web Audio API synthesizer, Canvas Confetti engine,
//               Theme toggle, Analytics tracker, and Habit Editing.
// ============================================================================

// App State
let habits = [];
let globalStreak = 0;
let currentTheme = 'midnight';

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

// Theme & Stats buttons
const themeToggleBtn = document.getElementById('themeToggleBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');
const analyticsPanel = document.getElementById('analyticsPanel');

// Analytics DOM Elements
const statCompletionsEl = document.getElementById('statCompletions');
const statBestStreakEl = document.getElementById('statBestStreak');
const statAvgRateEl = document.getElementById('statAvgRate');
const habitBreakdownEl = document.getElementById('habitBreakdown');

// Modal Elements
const modalOverlay = document.getElementById('modalOverlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const habitForm = document.getElementById('habitForm');
const habitNameInput = document.getElementById('habitName');
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
        // Seed default habits
        habits = [
            {
                id: '1',
                name: 'Code 30 minutes',
                emoji: '💻',
                color: 'purple',
                streak: 0,
                lastCompleted: '',
                history: []
            },
            {
                id: '2',
                name: 'Drink Water',
                emoji: '💧',
                color: 'blue',
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

    // Check for streak reset
    if (lastAccessDate && lastAccessDate !== today && lastAccessDate !== getYesterdayDateString()) {
        globalStreak = 0;
        localStorage.setItem('strive_global_streak', '0');
    }
    
    // Check individual streaks
    habits.forEach(h => {
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
    streakCountEl.textContent = globalStreak;
    habitCountEl.textContent = `${habits.length} active`;
};

// Render the list of habits
const renderHabitList = () => {
    habitListEl.innerHTML = '';
    const today = getTodayDateString();

    if (habits.length === 0) {
        emptyStateEl.style.display = 'flex';
        return;
    } else {
        emptyStateEl.style.display = 'none';
    }

    habits.forEach(h => {
        const isCompletedToday = (h.lastCompleted === today);

        const card = document.createElement('div');
        card.className = `habit-card color-${h.color} ${isCompletedToday ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="habit-left" onclick="toggleHabit('${h.id}')" style="cursor: pointer;">
                <div class="check-btn">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="habit-emoji">${h.emoji}</div>
                <div class="habit-details">
                    <h3>${h.name}</h3>
                    <div class="habit-stats">
                        <i class="fa-solid fa-fire"></i>
                        <span>${h.streak} day streak</span>
                    </div>
                </div>
            </div>
            <div class="card-actions">
                <button class="edit-btn" onclick="openEditModal('${h.id}'); event.stopPropagation();" title="Edit Habit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="delete-btn" onclick="deleteHabit('${h.id}'); event.stopPropagation();" title="Delete Habit">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
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
        // Uncheck
        h.lastCompleted = h.history.length > 1 ? h.history[h.history.length - 2] : '';
        h.history = h.history.filter(d => d !== today);
        
        // Recalculate streak
        if (h.history.includes(yesterday)) {
            h.streak = calculateHistoryStreak(h.history);
        } else {
            h.streak = 0;
        }
    } else {
        // Check complete
        h.history.push(today);
        h.lastCompleted = today;
        
        // Play synthesizer completion sound!
        playCompletionSound();
        
        // Calculate streak
        h.streak = calculateHistoryStreak(h.history);
    }

    // Update Global Streak
    recalculateGlobalStreak();
    saveData();
    updateUI();

    // Trigger Confetti if this checkoff hits 100% completion
    const newCompletedCount = habits.filter(h => h.lastCompleted === today).length;
    if (newCompletedCount === habits.length && oldCompletedCount !== habits.length) {
        startConfetti();
    }
};

// Re-usable Web Audio API chord synthesizer (no audio files needed!)
const playCompletionSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const audioCtx = new AudioContext();
        
        // Frequencies for a sweet C major arpeggio/chord (C5, E5, G5)
        const notes = [523.25, 659.25, 783.99]; 
        
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            // Stagger starting times slightly for an arpeggiated harp sound
            const startTime = audioCtx.currentTime + (idx * 0.06);
            
            // Smooth volume fade out
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });
    } catch (e) {
        console.warn('AudioContext failed to play audio.', e);
    }
};

// Compute consecutive days streak from history dates
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
    selectedEmoji = h.emoji;
    selectedColor = h.color;

    // Pre-select emoji option in list
    document.querySelectorAll('.emoji-option').forEach(el => {
        if (el.getAttribute('data-emoji') === h.emoji) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Pre-select color option in list
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
    
    // Generate date strings for last 30 days
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
        const cappedRate = Math.min(100, habitRate); // Capped at 100% just in case of duplicate days
        
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
        if (!name) return;

        if (isEditMode) {
            // Edit existing habit
            const id = editHabitIdInput.value;
            const h = habits.find(habit => habit.id === id);
            if (h) {
                h.name = name;
                h.emoji = selectedEmoji;
                h.color = selectedColor;
            }
        } else {
            // Create new habit
            const newHabit = {
                id: Date.now().toString(),
                name: name,
                emoji: selectedEmoji,
                color: selectedColor,
                streak: 0,
                lastCompleted: '',
                history: []
            };
            habits.push(newHabit);
        }

        saveData();
        updateUI();
        
        modalOverlay.classList.remove('active');
        resetForm();
    });

    // Expandable Analytics Panel Toggle
    statsToggleBtn.addEventListener('click', () => {
        analyticsPanel.classList.toggle('active');
        statsToggleBtn.classList.toggle('active');
    });

    // Theme Switcher Toggle (Midnight -> Cyberpunk -> Emerald -> Midnight)
    themeToggleBtn.addEventListener('click', () => {
        let nextTheme = 'midnight';
        if (currentTheme === 'midnight') nextTheme = 'cyberpunk';
        else if (currentTheme === 'cyberpunk') nextTheme = 'emerald';
        
        applyTheme(nextTheme);
        saveData();
        updateUI();
    });
};

const resetForm = () => {
    habitForm.reset();
    isEditMode = false;
    editHabitIdInput.value = "";
    
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
    // Stop any current animation first
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiParticles = [];

    // Colors matching theme palettes
    const colors = ['#a855f7', '#06b6d4', '#10b981', '#f97316', '#ec4899', '#3b82f6'];

    // Spawn 150 particles
    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height, // Spawn above screen
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
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2; // Falling velocity
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        // Draw particle
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
