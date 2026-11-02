/**
 * ClassFlow - Global API Client
 * Interfaces with the Node.js backend for shared Classroom Data
 * Supports Server-Sent Events (SSE) for Real-Time Live Sync across students
 */

const API = {
  baseUrl: '',
  eventSource: null,

  // Helper to attach classroom session headers
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (window.Storage && typeof Storage.getSession === 'function') {
      const session = Storage.getSession();
      if (session && session.classId) {
        headers['X-Class-Id'] = session.classId;
        headers['X-Class-Name'] = session.className || '';
        headers['X-Class-Key'] = session.password || '';
      }
    }
    return headers;
  },

  // Classroom Authentication (Join or Create)
  async authClassroom(credentials) {
    const res = await fetch(`${this.baseUrl}/api/auth/classroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Classroom authentication failed');
    return json;
  },

  // Quick check for referral / invite code
  async checkClassroom(className, password) {
    try {
      const params = new URLSearchParams({ class: className, pass: password || '' });
      const res = await fetch(`${this.baseUrl}/api/auth/classroom/check?${params.toString()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Fetch all shared class homework
  async getHomework(filters = {}) {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.date) params.append('date', filters.date);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${this.baseUrl}/api/homework?${params.toString()}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to load homework');
    }
    const json = await res.json();
    return json.data || [];
  },

  // Add new class homework
  async createHomework(data) {
    const res = await fetch(`${this.baseUrl}/api/homework`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add homework');
    return json.data;
  },

  // Delete class homework
  async deleteHomework(id) {
    const res = await fetch(`${this.baseUrl}/api/homework/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete homework');
    return json;
  },

  // Fetch today's covered classroom topics
  async getTodayTopics(filters = {}) {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${this.baseUrl}/api/today-topics?${params.toString()}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to load class topics');
    }
    const json = await res.json();
    return json.data || [];
  },

  // Add today's covered lecture topic
  async createTodayTopic(data) {
    const res = await fetch(`${this.baseUrl}/api/today-topics`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to post today topic');
    return json.data;
  },

  // Delete covered topic
  async deleteTodayTopic(id) {
    const res = await fetch(`${this.baseUrl}/api/today-topics/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete topic');
    return json;
  },

  // Fetch high-level class stats
  async getStats() {
    try {
      const res = await fetch(`${this.baseUrl}/api/stats`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Real-Time Server-Sent Events (SSE) Listener scoped to current classroom
  initLiveSync(onUpdate) {
    if (!window.EventSource) {
      console.warn('Browser does not support EventSource.');
      return;
    }

    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }

    const session = window.Storage && typeof Storage.getSession === 'function' ? Storage.getSession() : null;
    const query = session && session.classId ? `?classId=${encodeURIComponent(session.classId)}` : '';

    try {
      this.eventSource = new EventSource(`${this.baseUrl}/api/events${query}`);

      this.eventSource.addEventListener('homework_created', (e) => {
        onUpdate && onUpdate({ type: 'homework_created', data: JSON.parse(e.data) });
      });

      this.eventSource.addEventListener('homework_deleted', (e) => {
        onUpdate && onUpdate({ type: 'homework_deleted', data: JSON.parse(e.data) });
      });

      this.eventSource.addEventListener('topic_created', (e) => {
        onUpdate && onUpdate({ type: 'topic_created', data: JSON.parse(e.data) });
      });

      this.eventSource.addEventListener('topic_deleted', (e) => {
        onUpdate && onUpdate({ type: 'topic_deleted', data: JSON.parse(e.data) });
      });

      this.eventSource.onopen = () => {
        const syncBadges = document.querySelectorAll('.sync-dot');
        syncBadges.forEach(el => {
          el.classList.remove('bg-rose-500', 'bg-amber-500');
          el.classList.add('bg-emerald-500');
        });
      };

      this.eventSource.onerror = () => {
        const syncBadges = document.querySelectorAll('.sync-dot');
        syncBadges.forEach(el => {
          el.classList.remove('bg-emerald-500');
          el.classList.add('bg-amber-500');
        });
      };
    } catch (err) {
      console.error('Error connecting to live sync:', err);
    }
  }
};

window.API = API;
