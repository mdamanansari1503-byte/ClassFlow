/**
 * Component: Class Work & My Tasks
 * Clean screen without form clutter.
 * Box '+' button directly next to "Class Work" and "My Tasks".
 * No Global/Local badges.
 */

const WorkAndTasks = {
  async render() {
    const container = document.getElementById('view-work-tasks');
    if (!container) return;

    try {
      const globalHomework = await API.getHomework();
      const myTasksRaw = Storage.getTodos();
      const doneList = Storage.getDoneHomeworkIds();

      // Filter out expired homework (auto-delete client-side display)
      const todayStr = new Date().toISOString().split('T')[0];
      const globalHomework_filtered = globalHomework.filter(h => !h.dueDate || h.dueDate >= todayStr);

      // Sort My Tasks: uncompleted first (High > Medium > Low), completed last
      const pWeights = { 'High': 1, 'Medium': 2, 'Low': 3 };
      const myTasks = [...myTasksRaw].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pa = pWeights[a.priority] || 2;
        const pb = pWeights[b.priority] || 2;
        if (pa !== pb) return pa - pb;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });

      // HTML for Class Work Items
      let globalItemsHtml = '';
      if (globalHomework_filtered.length === 0) {
        globalItemsHtml = `
          <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p class="text-xs text-slate-400 mb-2">No homework posted yet.</p>
            <button onclick="App.openModal('modal-add-classwork')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition">
              + Post Homework
            </button>
          </div>
        `;
      } else {
        globalItemsHtml = globalHomework_filtered.map(hw => {
          const isDone = doneList.includes(hw.id);
          const topic = hw.topic || hw.title;
          return `
            <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border ${isDone ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm flex items-start justify-between gap-3 transition">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                    ${Utils.escapeHtml(hw.subject)}
                  </span>
                  ${Utils.formatDueDateBadge(hw.dueDate, hw.dueTime)}
                </div>
                <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug ${isDone ? 'line-through opacity-60' : ''}">
                  ${Utils.escapeHtml(topic)}
                </h4>
              </div>

              <div class="flex items-center gap-1 shrink-0 pt-0.5">
                <button onclick="WorkAndTasks.toggleGlobalDone('${hw.id}')" title="${isDone ? 'Mark as not done' : 'Mark done for me'}" class="p-2 rounded-xl text-xs font-semibold transition ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600'}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                </button>
                <button onclick="WorkAndTasks.deleteGlobal('${hw.id}')" title="Delete" class="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      // HTML for My Tasks Items
      let myTasksHtml = '';
      if (myTasks.length === 0) {
        myTasksHtml = `
          <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p class="text-xs text-slate-400 mb-2">No personal tasks yet.</p>
            <button onclick="App.openModal('modal-add-mytask')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition">
              + Add Task
            </button>
          </div>
        `;
      } else {
        myTasksHtml = myTasks.map(t => {
          const priBadge = t.priority === 'High'
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">🔴 High</span>`
            : t.priority === 'Low'
              ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">🟢 Low</span>`
              : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">🟡 Medium</span>`;
          return `
            <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border ${t.completed ? 'border-slate-200 dark:border-slate-800 opacity-60' : 'border-slate-200 dark:border-slate-800'} shadow-sm flex items-center justify-between gap-3 transition">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <input 
                  type="checkbox" 
                  ${t.completed ? 'checked' : ''} 
                  onchange="WorkAndTasks.toggleMyTask('${t.id}')"
                  class="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white truncate ${t.completed ? 'line-through text-slate-400 opacity-70' : ''}">
                    ${Utils.escapeHtml(t.topic)}
                  </p>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    ${priBadge}
                    <span class="text-[11px] font-bold text-slate-400">${Utils.escapeHtml(t.subject || 'General')}</span>
                    <span class="text-slate-300 dark:text-slate-700">•</span>
                    <span class="text-[11px] text-slate-400">🗓️ ${Utils.formatDate(t.dueDate)}</span>
                  </div>
                </div>
              </div>

              <button onclick="WorkAndTasks.deleteMyTask('${t.id}')" title="Delete" class="p-2 text-slate-300 hover:text-rose-500 transition shrink-0">
                &times;
              </button>
            </div>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div class="space-y-6">
          
          <!-- Screen Header (Clean title, no top buttons) -->
          <div class="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Class Work & My Tasks</h2>
            <p class="text-xs text-slate-400">Daily assignments and personal study checklist.</p>
          </div>

          <!-- Side-by-Side 2 Columns with Box Plus Buttons -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            <!-- COLUMN 1: CLASS WORK -->
            <div class="space-y-3">
              <div class="flex items-center justify-between pb-1">
                <div class="flex items-center gap-2.5">
                  <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Class Work</h3>
                  <!-- Box style plus icon -->
                  <button onclick="App.openModal('modal-add-classwork')" class="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition cursor-pointer" title="Add Class Work">
                    +
                  </button>
                </div>
                <span class="text-xs text-slate-400 font-bold">${globalHomework_filtered.length}</span>
              </div>

              <div class="space-y-3">
                ${globalItemsHtml}
              </div>
            </div>

            <!-- COLUMN 2: MY TASKS -->
            <div class="space-y-3">
              <div class="flex items-center justify-between pb-1">
                <div class="flex items-center gap-2.5">
                  <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">My Tasks</h3>
                  <!-- Box style plus icon -->
                  <button onclick="App.openModal('modal-add-mytask')" class="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition cursor-pointer" title="Add My Task">
                    +
                  </button>
                </div>
                <span class="text-xs text-slate-400 font-bold">${myTasks.length}</span>
              </div>

              <div class="space-y-3">
                ${myTasksHtml}
              </div>
            </div>

          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="p-6 text-center text-rose-500 text-xs">${err.message}</div>`;
    }
  },

  async handleAddGlobal(e) {
    e.preventDefault();
    const subject = document.getElementById('gw-subject-modal').value.trim();
    const topic = document.getElementById('gw-topic-modal').value.trim();
    const dueDate = document.getElementById('gw-date-modal').value;

    if (!subject || !topic) return;

    try {
      await API.createHomework({
        subject,
        topic,
        title: topic,
        dueDate,
        assignedBy: Storage.getProfile().name
      });
      Storage.addSubject(subject);
      App.closeModal('modal-add-classwork');
      Utils.showToast('Class Work posted!', 'success');
      this.render();
      App.updateBadges();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  handleAddMyTask(e) {
    e.preventDefault();
    const subject = document.getElementById('mt-subject-modal').value.trim();
    const topic = document.getElementById('mt-topic-modal').value.trim();
    const dueDate = document.getElementById('mt-date-modal').value;
    const priority = (document.getElementById('mt-priority-modal') && document.getElementById('mt-priority-modal').value) || 'Medium';

    if (!topic) return;

    Storage.addTodo({ subject, topic, dueDate, priority });
    if (subject) Storage.addSubject(subject);
    App.closeModal('modal-add-mytask');
    Utils.showToast('Task added!', 'success');
    this.render();
    App.updateBadges();
  },

  toggleMyTask(id) {
    const res = Storage.toggleTodo(id);
    if (res && res.completed) {
      Utils.playNotificationSound('success');
      Utils.triggerConfetti();
      Utils.showToast('Task completed! 🎉', 'success');
    }
    this.render();
    App.updateBadges();
  },

  deleteMyTask(id) {
    Storage.deleteTodo(id);
    this.render();
    App.updateBadges();
  },

  toggleGlobalDone(id) {
    const isNowDone = Storage.toggleDoneHomework(id);
    if (isNowDone) {
      Utils.playNotificationSound('success');
      Utils.triggerConfetti();
      Utils.showToast('Marked as done for you!', 'success');
    }
    this.render();
  },

  async deleteGlobal(id) {
    if (!confirm('Delete this homework?')) return;
    try {
      await API.deleteHomework(id);
      Utils.showToast('Homework deleted', 'info');
      this.render();
      App.updateBadges();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }
};

window.WorkAndTasks = WorkAndTasks;
