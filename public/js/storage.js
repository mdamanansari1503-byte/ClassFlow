/**
 * ClassFlow - LocalStorage State Manager
 * Handles user's private data:
 * 1) My Tasks (kept alongside Class Work)
 * 2) Subjects & Folders list (with delete support)
 * 3) Modules / Syllabus Tracker (Separate tab)
 * 4) Notes (with file/photo attachments - Separate tab)
 * 5) Reminders with Deadlines
 */

const STORAGE_KEYS = {
  SESSION: 'classflow_classroom_session',
  PROFILE: 'classflow_student_profile',
  TODOS: 'classflow_student_todos',
  SUBJECTS: 'classflow_student_subjects',
  FOLDERS: 'classflow_student_folders',
  MODULES: 'classflow_student_modules_data',
  NOTES: 'classflow_student_notes',
  REMINDERS: 'classflow_student_reminders',
  MY_HW_DONE: 'classflow_student_hw_done',
  THEME: 'classflow_theme'
};

const DEFAULT_SUBJECTS = ['Mathematics', 'Computer Science', 'Physics'];

const DEFAULT_TODOS = [
  {
    id: 'todo-1',
    subject: 'Mathematics',
    topic: 'Solve Exercise 7.2 Questions 1 to 10',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    completed: false
  },
  {
    id: 'todo-2',
    subject: 'Computer Science',
    topic: 'Implement Reverse Linked List on LeetCode #206',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    completed: false
  }
];

const DEFAULT_MODULES = [
  {
    id: 'mod-1',
    subject: 'Mathematics',
    folder: 'Calculus',
    title: 'Unit 1: Differential Calculus & Limits',
    status: 'completed'
  },
  {
    id: 'mod-2',
    subject: 'Mathematics',
    folder: 'Calculus',
    title: 'Unit 2: Integration by Parts & Partial Fractions',
    status: 'in_progress'
  },
  {
    id: 'mod-3',
    subject: 'Computer Science',
    folder: 'Data Structures',
    title: 'Module 1: Binary Search Trees & AVL Trees',
    status: 'in_progress'
  }
];

const DEFAULT_REMINDERS = [
  {
    id: 'rem-1',
    topic: 'Mathematics Mid-Term Exam',
    deadlineDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    deadlineTime: '10:00',
    completed: false
  },
  {
    id: 'rem-2',
    topic: 'Physics Lab Report Submission',
    deadlineDate: new Date().toISOString().split('T')[0],
    deadlineTime: '23:59',
    completed: false
  }
];

const Storage = {
  // Classroom Session (Multi-Class Authentication)
  getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSession(sessionData) {
    if (!sessionData) return;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
    if (sessionData.name) {
      this.setProfile({ name: sessionData.name });
    }
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // Student Profile
  getProfile() {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return { name: 'Student' };
    try { return JSON.parse(raw); } catch { return { name: 'Student' }; }
  },

  setProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  // Subjects Management (Choose, Create, Delete)
  getSubjects() {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
      return DEFAULT_SUBJECTS;
    }
    try { return JSON.parse(raw); } catch { return DEFAULT_SUBJECTS; }
  },

  addSubject(subjectName) {
    const trimmed = (subjectName || '').trim();
    if (!trimmed) return null;
    const list = this.getSubjects();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(list));
    }
    return trimmed;
  },

  deleteSubject(subjectName) {
    let list = this.getSubjects();
    list = list.filter(s => s !== subjectName);
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(list));

    // Also clean up folder map
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    let map = {};
    try { map = raw ? JSON.parse(raw) : {}; } catch { map = {}; }
    delete map[subjectName];
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(map));
  },

  // Folders per Subject (Get, Create, Delete)
  getFolders(subject) {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    let map = {};
    try { map = raw ? JSON.parse(raw) : {}; } catch { map = {}; }
    // Never auto-populate default folders; start empty
    if (!Array.isArray(map[subject])) {
      map[subject] = [];
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(map));
    } else {
      // One-time migration: wipe legacy default folders if they are the only ones stored
      const legacy = ['Unit 1', 'Module 2', 'Revision'];
      const stored = map[subject];
      const isOnlyLegacy = stored.length > 0 && stored.every(f => legacy.includes(f));
      if (isOnlyLegacy) {
        map[subject] = [];
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(map));
      }
    }
    return map[subject];
  },

  addFolder(subject, folderName) {
    const trimmed = (folderName || '').trim();
    if (!trimmed || !subject) return null;
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    let map = {};
    try { map = raw ? JSON.parse(raw) : {}; } catch { map = {}; }
    if (!Array.isArray(map[subject])) {
      map[subject] = [];
    }
    if (!map[subject].includes(trimmed)) {
      map[subject].push(trimmed);
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(map));
    }
    return trimmed;
  },

  deleteFolder(subject, folderName) {
    if (!subject || !folderName) return false;
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    let map = {};
    try { map = raw ? JSON.parse(raw) : {}; } catch { map = {}; }
    if (map[subject]) {
      map[subject] = map[subject].filter(f => f !== folderName);
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(map));
      return true;
    }
    return false;
  },

  // My Tasks (Local - alongside class work)
  getTodos() {
    const raw = localStorage.getItem(STORAGE_KEYS.TODOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(DEFAULT_TODOS));
      return DEFAULT_TODOS;
    }
    try { return JSON.parse(raw); } catch { return []; }
  },

  addTodo({ subject, topic, dueDate, priority }) {
    const todos = this.getTodos();
    const item = {
      id: 'task-' + Date.now().toString(36),
      subject: (subject || 'General').trim(),
      topic: topic.trim(),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      priority: priority || 'Medium',
      completed: false,
      createdAt: new Date().toISOString()
    };
    todos.unshift(item);
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
    return item;
  },

  toggleTodo(id) {
    const todos = this.getTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos[index].completed = !todos[index].completed;
      localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
      return todos[index];
    }
    return null;
  },

  deleteTodo(id) {
    let todos = this.getTodos();
    todos = todos.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
  },

  // Personal Checkmark for Global Homework
  getDoneHomeworkIds() {
    const raw = localStorage.getItem(STORAGE_KEYS.MY_HW_DONE);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  toggleDoneHomework(hwId) {
    let list = this.getDoneHomeworkIds();
    const exists = list.includes(hwId);
    if (exists) {
      list = list.filter(id => id !== hwId);
    } else {
      list.push(hwId);
    }
    localStorage.setItem(STORAGE_KEYS.MY_HW_DONE, JSON.stringify(list));
    return !exists;
  },

  // Modules / Syllabus Tracker (Separate tab)
  getModules() {
    const raw = localStorage.getItem(STORAGE_KEYS.MODULES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(DEFAULT_MODULES));
      return DEFAULT_MODULES;
    }
    try { return JSON.parse(raw); } catch { return []; }
  },

  addModule(modObj) {
    const list = this.getModules();
    const item = {
      id: 'mod-' + Date.now().toString(36),
      subject: (modObj.subject || 'General').trim(),
      folder: (modObj.folder || 'General').trim(),
      title: modObj.title.trim(),
      status: modObj.status || 'todo',
      fileId: modObj.fileId || null,
      fileName: modObj.fileName || null,
      fileType: modObj.fileType || null,
      fileSize: modObj.fileSize || null,
      isImage: !!modObj.isImage,
      previewUrl: modObj.previewUrl || null,
      createdAt: new Date().toISOString()
    };
    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(list));
    return item;
  },

  updateModuleStatus(id, newStatus) {
    const list = this.getModules();
    const target = list.find(m => m.id === id);
    if (target) {
      target.status = newStatus;
      localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(list));
      return target;
    }
    return null;
  },

  deleteModule(id) {
    let list = this.getModules();
    const target = list.find(m => m.id === id);
    if (target && target.fileId && window.DB) {
      window.DB.deleteFile(target.fileId).catch(() => {});
    }
    list = list.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(list));
  },

  // Notes (Separate tab - Subject-wise & Folders with photo/file upload)
  getNotes() {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  addNote(noteObj) {
    const notes = this.getNotes();
    const newNote = {
      id: 'note-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      subject: (noteObj.subject || 'General').trim(),
      folder: (noteObj.folder || 'General Notes').trim(),
      title: (noteObj.title || 'Untitled Note').trim(),
      content: (noteObj.content || '').trim(),
      fileId: noteObj.fileId || null,
      fileName: noteObj.fileName || null,
      fileType: noteObj.fileType || null,
      fileSize: noteObj.fileSize || null,
      isImage: !!noteObj.isImage,
      previewUrl: noteObj.previewUrl || null,
      createdAt: new Date().toISOString()
    };
    notes.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return newNote;
  },

  deleteNote(id) {
    let notes = this.getNotes();
    const target = notes.find(n => n.id === id);
    if (target && target.fileId && window.DB) {
      window.DB.deleteFile(target.fileId).catch(() => {});
    }
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  },

  // Reminders with Deadlines & Countdown
  getReminders() {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(DEFAULT_REMINDERS));
      return DEFAULT_REMINDERS;
    }
    try { return JSON.parse(raw); } catch { return []; }
  },

  addReminder({ topic, deadlineDate, deadlineTime }) {
    const reminders = this.getReminders();
    const item = {
      id: 'rem-' + Date.now().toString(36),
      topic: topic.trim(),
      deadlineDate: deadlineDate || new Date().toISOString().split('T')[0],
      deadlineTime: deadlineTime || '23:59',
      completed: false,
      createdAt: new Date().toISOString()
    };
    reminders.unshift(item);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    return item;
  },

  toggleReminder(id) {
    const reminders = this.getReminders();
    const rem = reminders.find(r => r.id === id);
    if (rem) {
      rem.completed = !rem.completed;
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
      return rem;
    }
    return null;
  },

  deleteReminder(id) {
    let reminders = this.getReminders();
    reminders = reminders.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  }
};

window.Storage = Storage;
