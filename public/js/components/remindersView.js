/**
 * Component: Reminders with Deadlines & Countdown
 * Box '+' button next to heading.
 * No Global/Local badges.
 */

const RemindersView = {
  tickerInterval: null,

  render() {
    const container = document.getElementById('view-reminders');
    if (!container) return;

    const reminders = Storage.getReminders();
    const todayStr = new Date().toISOString().split('T')[0];

    // Check for soon-to-expire reminders (< 24 hours or today)
    const urgentAlerts = [];
    reminders.forEach(r => {
      if (!r.completed) {
        const cd = Utils.getCountdownString(r.deadlineDate, r.deadlineTime);
        if (cd.urgent || r.deadlineDate === todayStr) {
          urgentAlerts.push({ ...r, countdownText: cd.text });
        }
      }
    });

    // Alert Banner HTML
    let alertBannerHtml = '';
    if (urgentAlerts.length > 0) {
      alertBannerHtml = `
        <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 animate-pulse">
          <div class="flex items-center gap-3">
            <span class="text-xl">⚠️</span>
            <div>
              <p class="font-bold text-xs uppercase tracking-wider">Deadline Alert Notification</p>
              <p class="text-xs">
                ${urgentAlerts.length === 1 
                  ? `<b>${Utils.escapeHtml(urgentAlerts[0].topic)}</b> deadline is expiring soon (${urgentAlerts[0].countdownText})!`
                  : `You have <b>${urgentAlerts.length} reminders</b> expiring soon! Check below.`}
              </p>
            </div>
          </div>
          <button onclick="Utils.playNotificationSound('reminder')" class="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shrink-0">
            🔔 Chime
          </button>
        </div>
      `;
    }

    // Reminders List
    let listHtml = '';
    if (reminders.length === 0) {
      listHtml = `
        <div class="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-400 mb-3">No active reminders scheduled.</p>
          <button onclick="App.openModal('modal-add-reminder')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition">
            + Schedule Reminder
          </button>
        </div>
      `;
    } else {
      listHtml = reminders.map(r => {
        const cd = Utils.getCountdownString(r.deadlineDate, r.deadlineTime);
        return `
          <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border ${r.completed ? 'border-slate-200 dark:border-slate-800 opacity-60' : cd.urgent ? 'border-rose-400 dark:border-rose-800 shadow-rose-500/5' : 'border-slate-200 dark:border-slate-800'} shadow-sm flex flex-col justify-between transition">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${cd.urgent ? 'badge-urgent' : 'badge-normal'}">
                  ${cd.urgent ? '⏳ Expiring Soon' : '⏰ Scheduled'}
                </span>
                <button onclick="RemindersView.deleteReminder('${r.id}')" title="Delete" class="p-1 text-slate-300 hover:text-rose-500 transition">
                  &times;
                </button>
              </div>

              <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-3 ${r.completed ? 'line-through' : ''}">
                ${Utils.escapeHtml(r.topic)}
              </h4>

              <!-- Countdown Box -->
              <div class="p-3 rounded-xl mb-3 ${cd.urgent ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'} flex items-center justify-between">
                <div>
                  <p class="text-[10px] uppercase font-bold tracking-wider opacity-70">Deadline</p>
                  <p class="text-xs font-semibold">${Utils.formatDate(r.deadlineDate)} at ${r.deadlineTime || '23:59'}</p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] uppercase font-bold tracking-wider opacity-70">Remaining</p>
                  <p class="text-xs font-black ${cd.urgent ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}">${cd.text}</p>
                </div>
              </div>
            </div>

            <!-- Footer: Check off -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-[10px] text-slate-400">Due ${Utils.formatDate(r.deadlineDate)}</span>
              <button onclick="RemindersView.toggleReminder('${r.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${r.completed ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600'}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                ${r.completed ? 'Done' : 'Mark Done'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Screen Header with Box Plus Button -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Reminders & Deadlines</h2>
            <button onclick="App.openModal('modal-add-reminder')" class="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition cursor-pointer" title="Add Reminder">
              +
            </button>
          </div>
          <span class="text-xs text-slate-400 font-bold">${reminders.length} reminders</span>
        </div>

        <!-- Notification Alert Banner if any reminder is ending soon -->
        ${alertBannerHtml}

        <!-- Reminders Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${listHtml}
        </div>

      </div>
    `;

    // Start auto-countdown ticker
    if (!this.tickerInterval) {
      this.tickerInterval = setInterval(() => {
        if (App.currentTab === 'reminders') {
          this.render();
        }
      }, 30000);
    }
  },

  handleAdd(e) {
    e.preventDefault();
    const topic = document.getElementById('rem-topic-modal').value.trim();
    const deadlineDate = document.getElementById('rem-date-modal').value;
    const deadlineTime = document.getElementById('rem-time-modal').value;

    if (!topic) return;

    Storage.addReminder({ topic, deadlineDate, deadlineTime });
    App.closeModal('modal-add-reminder');
    Utils.showToast('Reminder alert set with live countdown!', 'success');
    this.render();
    App.updateBadges();
  },

  toggleReminder(id) {
    const res = Storage.toggleReminder(id);
    if (res && res.completed) {
      Utils.playNotificationSound('success');
      Utils.triggerConfetti();
      Utils.showToast('Reminder completed! 🎉', 'success');
    }
    this.render();
    App.updateBadges();
  },

  deleteReminder(id) {
    Storage.deleteReminder(id);
    Utils.showToast('Reminder deleted', 'info');
    this.render();
    App.updateBadges();
  }
};

window.RemindersView = RemindersView;
