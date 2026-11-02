/**
 * ClassFlow - Simplified Application Controller
 * Handles 5 Views:
 * 1) work-tasks (Class Work + My Tasks)
 * 2) today-topics (Classroom Daily Lecture Log)
 * 3) modules (Modules & Syllabus Tracker)
 * 4) notes (Study Notes & File/Photo Attachments)
 * 5) reminders (Deadlines, Live Countdown & Expiry Alert)
 */

const App = {
  currentTab: 'work-tasks',

  init() {
    this.setupTheme();
    this.setupProfile();
    this.setupTabs();
    this.setupModals();
    this.checkClassroomSession();
  },

  // Classroom Session & Security Gate
  checkClassroomSession() {
    const params = new URLSearchParams(window.location.search);
    const refClass = params.get('class');
    const refPass = params.get('pass') || params.get('key');

    // Case 1: Referral Link present in URL -> auto-fill class & password!
    if (refClass) {
      this.openClassroomGateModal({
        className: refClass,
        password: refPass || '',
        isReferral: true
      });
      return;
    }

    // Case 2: Existing Session in Storage
    const session = Storage.getSession();
    if (session && session.classId) {
      this.applyClassroomSession(session);
      return;
    }

    // Case 3: First time visit / No session -> prompt for name, class, pass
    this.openClassroomGateModal({ isReferral: false });
  },

  applyClassroomSession(session) {
    // Update classroom headers & names in UI
    const sideClass = document.getElementById('sidebar-classroom-name');
    const mobClass = document.getElementById('mobile-classroom-name');
    const nameEl = document.getElementById('student-display-name');

    if (sideClass) sideClass.textContent = session.className || 'General';
    if (mobClass) mobClass.textContent = session.className || 'General';
    if (nameEl) nameEl.textContent = session.name || 'Student';

    // Init live sync for this specific classroom
    this.initLiveSync();
    this.updateBadges();
    this.updateSubjectDatalist();

    // Render active tab
    this.switchTab(this.currentTab || 'work-tasks');
  },

  openClassroomGateModal(opts = {}) {
    const modal = document.getElementById('modal-classroom-gate');
    if (!modal) return;

    const nameInput = document.getElementById('gate-student-name');
    const classInput = document.getElementById('gate-class-name');
    const passInput = document.getElementById('gate-class-password');
    const banner = document.getElementById('gate-referral-banner');
    const bannerClassName = document.getElementById('gate-referral-class-name');
    const classLock = document.getElementById('gate-class-lock-badge');
    const passLock = document.getElementById('gate-pass-lock-badge');
    const errBox = document.getElementById('gate-error-message');

    if (errBox) {
      errBox.textContent = '';
      errBox.classList.add('hidden');
    }

    // If referral link: prefill class & pass, lock them, only ask for student name!
    if (opts.isReferral && opts.className) {
      if (classInput) {
        classInput.value = opts.className;
        classInput.readOnly = true;
        classInput.classList.add('opacity-80', 'bg-slate-100', 'dark:bg-slate-800/80');
      }
      if (passInput) {
        passInput.value = opts.password || '';
        if (opts.password) {
          passInput.readOnly = true;
          passInput.classList.add('opacity-80', 'bg-slate-100', 'dark:bg-slate-800/80');
        } else {
          passInput.readOnly = false;
          passInput.classList.remove('opacity-80', 'bg-slate-100', 'dark:bg-slate-800/80');
        }
      }
      if (banner && bannerClassName) {
        bannerClassName.textContent = opts.className;
        banner.classList.remove('hidden');
      }
      if (classLock) classLock.classList.remove('hidden');
      if (passLock && opts.password) passLock.classList.remove('hidden');
      if (nameInput) {
        nameInput.value = (Storage.getProfile() && Storage.getProfile().name !== 'Student') ? Storage.getProfile().name : '';
        setTimeout(() => nameInput.focus(), 100);
      }
    } else {
      // Normal Gate: editable inputs
      const currentSession = Storage.getSession();
      if (classInput) {
        classInput.value = currentSession ? currentSession.className : '';
        classInput.readOnly = false;
        classInput.classList.remove('opacity-80', 'bg-slate-100', 'dark:bg-slate-800/80');
      }
      if (passInput) {
        passInput.value = currentSession ? currentSession.password : '';
        passInput.readOnly = false;
        passInput.classList.remove('opacity-80', 'bg-slate-100', 'dark:bg-slate-800/80');
      }
      if (nameInput) {
        const prof = Storage.getProfile();
        nameInput.value = (prof && prof.name !== 'Student') ? prof.name : '';
      }
      if (banner) banner.classList.add('hidden');
      if (classLock) classLock.classList.add('hidden');
      if (passLock) passLock.classList.add('hidden');
      if (nameInput) setTimeout(() => nameInput.focus(), 100);
    }

    modal.classList.remove('hidden');
  },

  async handleClassroomGateSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('gate-student-name');
    const classInput = document.getElementById('gate-class-name');
    const passInput = document.getElementById('gate-class-password');
    const errBox = document.getElementById('gate-error-message');
    const btn = document.getElementById('gate-submit-btn');

    const name = nameInput ? nameInput.value.trim() : '';
    const className = classInput ? classInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';

    if (!name || !className || !password) return;

    if (errBox) {
      errBox.textContent = '';
      errBox.classList.add('hidden');
    }
    if (btn) btn.disabled = true;

    try {
      const res = await API.authClassroom({ name, className, password });
      if (!res.success) throw new Error(res.error || 'Failed to authenticate');

      // Save Session
      const session = {
        name,
        className: res.class.name,
        classId: res.class.id,
        password: res.class.password
      };
      Storage.setSession(session);

      // Clean up URL query parameters without page reload
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Close modal
      const modal = document.getElementById('modal-classroom-gate');
      if (modal) modal.classList.add('hidden');

      this.applyClassroomSession(session);
      Utils.showToast(res.message || `Welcome to ${res.class.name}!`, 'success');
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      } else {
        Utils.showToast(err.message, 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  switchClassroom() {
    this.openClassroomGateModal({ isReferral: false });
  },

  openInviteModal() {
    const session = Storage.getSession();
    if (!session || !session.className) {
      this.switchClassroom();
      return;
    }

    const modal = document.getElementById('modal-class-invite');
    if (!modal) return;

    const nameEl = document.getElementById('invite-modal-class-name');
    const passEl = document.getElementById('invite-modal-class-pass');
    const urlInput = document.getElementById('invite-modal-url');

    if (nameEl) nameEl.textContent = session.className;
    if (passEl) passEl.textContent = session.password;

    const url = `${window.location.origin}${window.location.pathname}?class=${encodeURIComponent(session.className)}&pass=${encodeURIComponent(session.password)}`;
    if (urlInput) urlInput.value = url;

    this.openModal('modal-class-invite');
  },

  copyInviteLink() {
    const urlInput = document.getElementById('invite-modal-url');
    if (!urlInput || !urlInput.value) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(urlInput.value)
        .then(() => {
          Utils.showToast('Referral link copied! Classmates only need to enter their name.', 'success');
        })
        .catch(() => {
          urlInput.select();
          document.execCommand('copy');
          Utils.showToast('Referral link copied!', 'success');
        });
    } else {
      urlInput.select();
      document.execCommand('copy');
      Utils.showToast('Referral link copied!', 'success');
    }
  },

  // Theme Toggle (Dark / Light)
  setupTheme() {
    const saved = localStorage.getItem('classflow_theme') || 'dark';
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.updateThemeButton();
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('classflow_theme', isDark ? 'dark' : 'light');
    this.updateThemeButton();
  },

  updateThemeButton() {
    const isDark = document.documentElement.classList.contains('dark');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = isDark ? '☀️' : '🌙';
    }
  },

  // Student Profile
  setupProfile() {
    const profile = Storage.getProfile();
    const nameEl = document.getElementById('student-display-name');
    if (nameEl) nameEl.textContent = profile.name || 'Student';
  },

  openProfileModal() {
    const profile = Storage.getProfile();
    const session = Storage.getSession();
    const input = document.getElementById('profile-name-input');
    const classEl = document.getElementById('profile-modal-class-name');
    if (input) input.value = profile.name || '';
    if (classEl) classEl.textContent = (session && session.className) ? session.className : 'General';
    this.openModal('modal-student-profile');
  },

  closeProfileModal() {
    this.closeModal('modal-student-profile');
  },

  saveProfile(e) {
    e.preventDefault();
    const input = document.getElementById('profile-name-input');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    Storage.setProfile({ name });
    const session = Storage.getSession();
    if (session) {
      session.name = name;
      Storage.setSession(session);
    }
    this.setupProfile();
    this.closeProfileModal();
    Utils.showToast('Name updated!', 'success');
  },

  // Tab Navigation (5 Tabs)
  setupTabs() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update active class on both sidebar and mobile bottom bar
    document.querySelectorAll('.nav-tab').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all view containers
    const views = ['work-tasks', 'today-topics', 'modules', 'notes', 'reminders'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === tabName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Render chosen component
    switch (tabName) {
      case 'work-tasks':
        WorkAndTasks.render();
        break;
      case 'today-topics':
        TodayTopics.render();
        break;
      case 'modules':
        ModulesView.render();
        break;
      case 'notes':
        NotesView.render();
        break;
      case 'reminders':
        RemindersView.render();
        break;
    }

    this.updateBadges();
  },

  // Modal Dialogs Management
  setupModals() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
      }
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Prefill context for Module modal
    if (modalId === 'modal-add-module') {
      const sub = (window.ModulesView && ModulesView.currentSubject) || Storage.getSubjects()[0] || 'General';
      const subInput = document.getElementById('mod-subject-input-modal');
      const folderSelect = document.getElementById('mod-folder-input-modal');
      if (subInput) subInput.value = sub;
      if (folderSelect) {
        const folders = Storage.getFolders(sub);
        folderSelect.innerHTML = folders.map(f => `<option value="${Utils.escapeHtml(f)}">${Utils.escapeHtml(f)}</option>`).join('');
      }
      const fileInput = document.getElementById('mod-file-modal');
      if (fileInput) fileInput.value = '';
      const pendingList = document.getElementById('mod-pending-files-list');
      if (pendingList) pendingList.innerHTML = '';
      if (window.ModulesView) ModulesView.pendingFiles = [];
    }

    // Prefill context for Note modal
    if (modalId === 'modal-add-note') {
      const sub = (window.NotesView && NotesView.currentSubject) || Storage.getSubjects()[0] || 'General';
      const subInput = document.getElementById('note-subject-input-modal');
      const folderSelect = document.getElementById('note-folder-modal');
      if (subInput) subInput.value = sub;
      if (folderSelect) {
        const folders = Storage.getFolders(sub);
        folderSelect.innerHTML = folders.map(f => `<option value="${Utils.escapeHtml(f)}">${Utils.escapeHtml(f)}</option>`).join('');
      }
      const fileInput = document.getElementById('note-file-modal');
      if (fileInput) fileInput.value = '';
      const pendingList = document.getElementById('note-pending-files-list');
      if (pendingList) pendingList.innerHTML = '';
      if (window.NotesView) NotesView.pendingFiles = [];
    }

    // Prefill today's date
    const todayStr = new Date().toISOString().split('T')[0];
    const gwDate = document.getElementById('gw-date-modal');
    const mtDate = document.getElementById('mt-date-modal');
    const ttDate = document.getElementById('tt-date-modal');
    const remDate = document.getElementById('rem-date-modal');

    if (gwDate && !gwDate.value) gwDate.value = todayStr;
    if (mtDate && !mtDate.value) mtDate.value = todayStr;
    if (ttDate && !ttDate.value) ttDate.value = todayStr;
    if (remDate && !remDate.value) remDate.value = todayStr;

    modal.classList.remove('hidden');
    const firstInput = modal.querySelector('input:not([readonly]), select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  },

  // Save Module from Modal (delegates to ModulesView)
  handleSaveModule(e) {
    if (window.ModulesView && typeof ModulesView.handleAddModuleModal === 'function') {
      return ModulesView.handleAddModuleModal(e);
    }
  },

  // Update Subject suggestions datalist
  updateSubjectDatalist() {
    const datalist = document.getElementById('subject-suggestions');
    if (datalist) {
      const subjects = Storage.getSubjects();
      datalist.innerHTML = subjects.map(s => `<option value="${Utils.escapeHtml(s)}"></option>`).join('');
    }
  },

  // Update Badge Counts
  async updateBadges() {
    const stats = await API.getStats();
    const todos = Storage.getTodos();
    const reminders = Storage.getReminders();

    const tasksCount = (stats ? (stats.totalHomework || 0) : 0) + todos.filter(t => !t.completed).length;
    const topicsCount = stats ? (stats.todayTopicsCount || 0) : 0;
    const remindersCount = reminders.filter(r => !r.completed).length;

    const bTasks = document.getElementById('sidebar-badge-tasks');
    const bTopics = document.getElementById('sidebar-badge-topics');
    const bRem = document.getElementById('sidebar-badge-reminders');

    if (bTasks) bTasks.textContent = tasksCount;
    if (bTopics) bTopics.textContent = topicsCount;
    if (bRem) bRem.textContent = remindersCount;

    this.updateSubjectDatalist();
  },

  // Live SSE Sync
  initLiveSync() {
    API.initLiveSync((event) => {
      if (event.type === 'homework_created') {
        Utils.playNotificationSound('success');
        Utils.showToast(`New Class Work: "${event.data.topic || event.data.title}"`, 'info');
      } else if (event.type === 'topic_created') {
        Utils.playNotificationSound('success');
        Utils.showToast(`New Lecture Logged: "${event.data.topicCovered || event.data.topicTitle}"`, 'info');
      }

      this.updateBadges();

      if (this.currentTab === 'work-tasks') {
        WorkAndTasks.render();
      } else if (this.currentTab === 'today-topics') {
        TodayTopics.render();
      }
    });
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
