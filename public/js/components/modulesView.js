/**
 * Component: Modules & Syllabus Tracker
 * Multiple file attachments per module, cleaner card design.
 */

const ModulesView = {
  currentSubject: '',
  currentFolder: 'ALL',
  pendingFiles: [],   // Array of { name, type, size, isImage, data }

  render() {
    const container = document.getElementById('view-modules');
    if (!container) return;

    const subjects = Storage.getSubjects();
    if (!this.currentSubject || !subjects.includes(this.currentSubject)) {
      this.currentSubject = subjects[0] || 'General';
    }

    const folders = Storage.getFolders(this.currentSubject);
    let allModules = Storage.getModules().filter(m => m.subject === this.currentSubject);

    if (this.currentFolder !== 'ALL') {
      allModules = allModules.filter(m => m.folder === this.currentFolder);
    }

    const subjectModules = Storage.getModules().filter(m => m.subject === this.currentSubject);

    // --- Card HTML ---
    let itemsHtml = '';
    if (allModules.length === 0) {
      itemsHtml = `
        <div class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p class="text-2xl mb-2">📂</p>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">No modules here yet</p>
          <p class="text-xs text-slate-400 mb-4">Add your first unit or chapter to this folder.</p>
          <button onclick="App.openModal('modal-add-module')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
            + Add Module
          </button>
        </div>
      `;
    } else {
      itemsHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${allModules.map(m => {
        // Build attachments row
        const filesList = Array.isArray(m.files) ? m.files : (m.fileId ? [{ fileId: m.fileId, fileName: m.fileName, isImage: m.isImage, previewUrl: m.previewUrl }] : []);
        let filesHtml = '';
        if (filesList.length > 0) {
          filesHtml = `
            <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">📎 Attachments (${filesList.length})</p>
              ${filesList.map(f => {
                if (f.isImage) {
                  return `
                    <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                      <img src="${f.previewUrl}" alt="${Utils.escapeHtml(f.fileName || 'Photo')}" class="w-full max-h-36 object-cover cursor-pointer" onclick="ModulesView.viewFullImage('${f.fileId}')">
                      <div class="px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <span class="text-[11px] text-slate-500 truncate">📷 ${Utils.escapeHtml(f.fileName || 'Photo')}</span>
                        <button onclick="ModulesView.downloadAttachment('${f.fileId}','${Utils.escapeHtml(f.fileName)}')" class="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">↓ Save</button>
                      </div>
                    </div>`;
                } else {
                  return `
                    <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-base shrink-0">📄</span>
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">${Utils.escapeHtml(f.fileName || 'File')}</span>
                      </div>
                      <button onclick="ModulesView.downloadAttachment('${f.fileId}','${Utils.escapeHtml(f.fileName)}')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 text-white shrink-0 hover:bg-blue-700 transition">↓ Download</button>
                    </div>`;
                }
              }).join('')}
            </div>`;
        }

        const statusColor = m.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' : m.status === 'in_progress' ? 'bg-amber-50/50 dark:bg-amber-950/20 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';

        return `
          <div class="rounded-2xl border ${statusColor} shadow-sm overflow-hidden transition">
            <div class="p-4">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-1.5">
                    📁 ${Utils.escapeHtml(m.folder || 'General')}
                  </span>
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-snug ${m.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''}">
                    ${Utils.escapeHtml(m.title)}
                  </h4>
                </div>
                <button onclick="ModulesView.deleteModule('${m.id}')" title="Delete" class="shrink-0 p-1 text-slate-300 hover:text-rose-500 transition text-lg leading-none">&times;</button>
              </div>

              <select onchange="ModulesView.changeStatus('${m.id}', this.value)" class="w-full text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-1.5 px-2.5 focus:outline-none">
                <option value="todo" ${m.status === 'todo' ? 'selected' : ''}>⭕ Not Started</option>
                <option value="in_progress" ${m.status === 'in_progress' ? 'selected' : ''}>⏳ In Progress</option>
                <option value="completed" ${m.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
              </select>

              ${filesHtml}
            </div>
          </div>
        `;
      }).join('')}</div>`;
    }

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Modules & Syllabus</h2>
            <button onclick="App.openModal('modal-add-module')" class="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition" title="Add Module">+</button>
          </div>
          <span class="text-xs text-slate-400 font-bold">${subjectModules.length} modules</span>
        </div>

        <!-- Subject bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject:</span>
            <select id="mod-subject-select" onchange="ModulesView.changeSubject(this.value)" class="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none">
              ${subjects.map(s => `<option value="${Utils.escapeHtml(s)}" ${s === this.currentSubject ? 'selected' : ''}>${Utils.escapeHtml(s)}</option>`).join('')}
            </select>
            <button onclick="ModulesView.deleteCurrentSubject()" title="Delete Subject" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition">🗑️</button>
          </div>
          <form onsubmit="ModulesView.handleCreateSubject(event)" class="flex items-center gap-1.5 w-full sm:w-auto">
            <input type="text" id="mod-new-subject-input" placeholder="+ New Subject…" required class="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none">
            <button type="submit" class="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shrink-0">Create</button>
          </form>
        </div>

        <!-- Folders bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button onclick="ModulesView.changeFolder('ALL')" class="px-3 py-1 rounded-xl text-xs font-bold transition ${this.currentFolder === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">All</button>
            ${folders.map(f => `
              <div class="flex items-center rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 ${this.currentFolder === f ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                <button onclick="ModulesView.changeFolder('${Utils.escapeHtml(f)}')" class="px-2.5 py-1 text-xs font-bold">📁 ${Utils.escapeHtml(f)}</button>
                <button onclick="ModulesView.deleteFolderConfirm('${Utils.escapeHtml(f)}')" title="Delete folder" class="px-1.5 py-1 text-xs text-rose-400 hover:text-rose-600 transition">&times;</button>
              </div>
            `).join('')}
          </div>
          <form onsubmit="ModulesView.handleCreateFolder(event)" class="flex items-center gap-1.5">
            <input type="text" id="mod-new-folder-input" placeholder="+ Add folder…" required class="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none">
            <button type="submit" class="px-2.5 py-1 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold transition">Add</button>
          </form>
        </div>

        <!-- Items -->
        <div>${itemsHtml}</div>

      </div>
    `;
  },

  changeSubject(sub) {
    this.currentSubject = sub;
    this.currentFolder = 'ALL';
    this.render();
  },

  handleCreateSubject(e) {
    e.preventDefault();
    const input = document.getElementById('mod-new-subject-input');
    const name = input ? input.value.trim() : '';
    if (!name) return;
    Storage.addSubject(name);
    this.currentSubject = name;
    this.currentFolder = 'ALL';
    Utils.showToast(`Subject "${name}" created!`, 'success');
    this.render();
  },

  deleteCurrentSubject() {
    if (!confirm(`Delete subject "${this.currentSubject}"?`)) return;
    Storage.deleteSubject(this.currentSubject);
    this.currentSubject = '';
    Utils.showToast('Subject deleted', 'info');
    this.render();
  },

  changeFolder(folder) {
    this.currentFolder = folder;
    this.render();
  },

  handleCreateFolder(e) {
    e.preventDefault();
    const input = document.getElementById('mod-new-folder-input');
    const name = input ? input.value.trim() : '';
    if (!name) return;
    Storage.addFolder(this.currentSubject, name);
    this.currentFolder = name;
    Utils.showToast(`Folder "${name}" created!`, 'success');
    this.render();
  },

  deleteFolderConfirm(folderName) {
    if (!confirm(`Delete folder "${folderName}"?`)) return;
    Storage.deleteFolder(this.currentSubject, folderName);
    this.currentFolder = 'ALL';
    Utils.showToast(`Folder "${folderName}" removed`, 'info');
    this.render();
  },

  // Handle multiple file selection — show preview list in modal
  handleFileSelect(input) {
    this.pendingFiles = [];
    const listEl = document.getElementById('mod-pending-files-list');
    if (!input.files || input.files.length === 0) {
      if (listEl) listEl.innerHTML = '';
      return;
    }

    const files = Array.from(input.files);
    let loaded = 0;

    if (listEl) listEl.innerHTML = `<p class="text-[11px] text-slate-400">Loading ${files.length} file(s)…</p>`;

    files.forEach((file, idx) => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.pendingFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          isImage,
          data: ev.target.result
        });
        loaded++;
        if (loaded === files.length) {
          this._renderPendingList(listEl);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  _renderPendingList(listEl) {
    if (!listEl) return;
    listEl.innerHTML = this.pendingFiles.map((f, i) => {
      const icon = f.isImage ? '🖼️' : '📄';
      const kb = Math.round(f.size / 1024);
      return `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          ${f.isImage ? `<img src="${f.data}" class="h-8 w-8 rounded-lg object-cover shrink-0">` : `<span class="text-lg shrink-0">${icon}</span>`}
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">${Utils.escapeHtml(f.name)}</span>
          <span class="text-[10px] text-slate-400 shrink-0">${kb} KB</span>
          <button type="button" onclick="ModulesView._removePending(${i})" class="text-rose-400 hover:text-rose-600 text-xs shrink-0">&times;</button>
        </div>`;
    }).join('');
  },

  _removePending(idx) {
    this.pendingFiles.splice(idx, 1);
    const listEl = document.getElementById('mod-pending-files-list');
    this._renderPendingList(listEl);
  },

  async handleAddModuleModal(e) {
    e.preventDefault();
    const subject = document.getElementById('mod-subject-input-modal').value;
    const folder = document.getElementById('mod-folder-input-modal').value;
    const title = document.getElementById('mod-title-modal').value.trim();
    const status = document.getElementById('mod-status-modal').value;
    if (!title) return;

    // Save all pending files to IndexedDB
    const savedFiles = [];
    for (const pf of this.pendingFiles) {
      const fileId = 'modfile-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      if (window.DB) {
        await window.DB.saveFile(fileId, { name: pf.name, type: pf.type, size: pf.size, data: pf.data });
      }
      savedFiles.push({ fileId, fileName: pf.name, isImage: pf.isImage, previewUrl: pf.isImage ? pf.data : null });
    }

    Storage.addModule({ subject, folder, title, status, files: savedFiles });

    this.pendingFiles = [];
    App.closeModal('modal-add-module');
    Utils.showToast(`Module saved${savedFiles.length ? ' with ' + savedFiles.length + ' file(s)' : ''}!`, 'success');
    this.render();
  },

  async downloadAttachment(fileId, filename) {
    if (!window.DB) return;
    try {
      const file = await window.DB.getFile(fileId);
      if (!file || !file.data) return Utils.showToast('File not found', 'error');
      const a = document.createElement('a');
      a.href = file.data;
      a.download = filename || file.name || 'download';
      a.click();
    } catch (err) {
      Utils.showToast('Download failed: ' + err.message, 'error');
    }
  },

  async viewFullImage(fileId) {
    if (!window.DB) return;
    const file = await window.DB.getFile(fileId);
    if (!file || !file.data) return;
    const w = window.open('');
    w.document.write(`<img src="${file.data}" style="max-width:100%;height:auto;display:block;margin:auto;">`);
  },

  changeStatus(id, newStatus) {
    Storage.updateModuleStatus(id, newStatus);
    if (newStatus === 'completed') {
      Utils.playNotificationSound('success');
      Utils.triggerConfetti();
      Utils.showToast('Module completed! 🎉', 'success');
    }
    this.render();
  },

  deleteModule(id) {
    if (!confirm('Delete this module?')) return;
    Storage.deleteModule(id);
    this.render();
  }
};

window.ModulesView = ModulesView;
