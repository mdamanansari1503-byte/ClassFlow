/**
 * Component: Today's Topics (What was covered in class)
 * Clean screen with box '+' button beside heading.
 * No Global/Local badges.
 */

const TodayTopics = {
  async render() {
    const container = document.getElementById('view-today-topics');
    if (!container) return;

    try {
      const allTopics = await API.getTodayTopics();

      let listHtml = '';
      if (allTopics.length === 0) {
        listHtml = `
          <div class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <p class="text-xs text-slate-400 mb-3">No lecture topics logged yet today.</p>
            <button onclick="App.openModal('modal-add-todaytopic')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition">
              + Log Lecture
            </button>
          </div>
        `;
      } else {
        listHtml = allTopics.map(t => {
          const topic = t.topicCovered || t.topicTitle;
          const ref = t.reference || t.assignedHomeworkRef;
          return `
            <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between gap-3 transition">
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    ${Utils.escapeHtml(t.subject)}
                  </span>
                  <span class="text-[11px] text-slate-400">
                    🗓️ ${Utils.formatDate(t.date)}
                  </span>
                </div>

                <h3 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  ${Utils.escapeHtml(topic)}
                </h3>

                ${ref ? `
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    <span class="text-slate-400">Reference:</span>
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">${Utils.escapeHtml(ref)}</span>
                  </div>
                ` : ''}
              </div>

              <button onclick="TodayTopics.deleteTopic('${t.id}')" title="Delete" class="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div class="space-y-6 max-w-4xl mx-auto">
          
          <!-- Screen Header with Box Plus Button -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-black text-slate-900 dark:text-white">Today's Class Topics</h2>
              <button onclick="App.openModal('modal-add-todaytopic')" class="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition cursor-pointer" title="Log Topic">
                +
              </button>
            </div>
            <span class="text-xs text-slate-400 font-bold">${allTopics.length} lectures</span>
          </div>

          <!-- Clean Topics Feed -->
          <div class="space-y-3">
            ${listHtml}
          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-rose-500 text-xs">${err.message}</div>`;
    }
  },

  async handleAdd(e) {
    e.preventDefault();
    const subject = document.getElementById('tt-subject-modal').value.trim();
    const topicCovered = document.getElementById('tt-topic-modal').value.trim();
    const reference = document.getElementById('tt-ref-modal').value.trim();
    const date = document.getElementById('tt-date-modal').value;

    if (!subject || !topicCovered) return;

    try {
      await API.createTodayTopic({
        subject,
        topicCovered,
        topicTitle: topicCovered,
        reference,
        assignedHomeworkRef: reference,
        date,
        postedBy: Storage.getProfile().name
      });
      Storage.addSubject(subject);
      App.closeModal('modal-add-todaytopic');
      Utils.showToast('Lecture topic saved!', 'success');
      this.render();
      App.updateBadges();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  },

  async deleteTopic(id) {
    if (!confirm('Delete this lecture entry?')) return;
    try {
      await API.deleteTodayTopic(id);
      Utils.showToast('Topic deleted', 'info');
      this.render();
      App.updateBadges();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }
};

window.TodayTopics = TodayTopics;
