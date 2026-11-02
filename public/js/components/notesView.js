/**
 * Component: Notes & Attachments
 * Multiple file attachments per note, cleaner card design.
 */

const NotesView = {
  currentSubject: '',
  currentFolder: 'ALL',
  pendingFiles: [],   // Array of { name, type, size, isImage, data }

  render() {
    const container = document.getElementById('view-notes');
    if (!container) return;

    const subjects = Storage.getSubjects();
    if (!this.currentSubject || !subjects.includes(this.currentSubject)) {
      this.currentSubject = subjects[0] || 'General';
    }

    const folders = Storage.getFolders(this.currentSubject);
    let allNotes = Storage.getNotes().filter(n => n.subject === this.currentSubject);
    if (this.currentFolder !== 'ALL') {
      allNotes = allNotes.filter(n => n.folder === this.currentFolder);
    }

    // --- Card HTML ---
    let notesHtml = '';
    if (allNotes.length === 0) {
      notesHtml = `
        <div class="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <p class="text-2xl mb-2">📓</p>
          <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">No notes here yet</p>
          <p class="text-xs text-slate-400 mb-4">Write notes or attach PDFs, photos, and docs.</p>
          <button onclick="App.openModal('modal-add-note')" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition">
            + Write First Note
          </button>
        </div>
      `;
    } else {
      notesHtml = allNotes.map(n => {
        // Support both old single-file format and new multi-file format
        const filesList = Array.isArray(n.files) ? n.files : (n.fileId ? [{ fileId: n.fileId, fileName: n.fileName, isImage: n.isImage, previewUrl: n.previewUrl }] : []);

        let filesHtml = '';
        if (filesList.length > 0) {
          filesHtml = `
            <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">📎 Files (${filesList.length})</p>
              ${filesList.map(f => {
                if (f.isImage) {
                  return `
                    <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                      <img src="${f.previewUrl}" alt="${Utils.escapeHtml(f.fileName || 'Photo')}" class="w-full max-h-40 object-cover cursor-pointer" onclick="NotesView.viewFullImage('${f.fileId}')">
                      <div class="px-2.5 py-1.5 flex items-center justify-between gap-2">
                        <span class="text-[11px] text-slate-500 truncate">📷 ${Utils.escapeHtml(f.fileName || 'Photo')}</span>
                        <button onclick="NotesView.downloadAttachment('${f.fileId}','${Utils.escapeHtml(f.fileName)}')" class="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0">↓ Save</button>
                      </div>
                    </div>`;
                } else {
                  return `
                    <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-base shrink-0">📄</span>
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">${Utils.escapeHtml(f.fileName || 'File')}</span>
                      </div>
                      <button onclick="NotesView.downloadAttachment('${f.fileId}','${Utils.escapeHtml(f.fileName)}')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 text-white shrink-0 hover:bg-amber-700 transition">↓ Download</button>
                    </div>`;
                }
              }).join('')}
            </div>`;
        }

        return `
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition flex flex-col">
            <div class="p-4 flex-1">
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  📁 ${Utils.escapeHtml(n.folder || 'General')}
                </span>
                <button onclick="NotesView.deleteNote('${n.id}')" title="Delete note" class="p-1 text-slate-300 hover:text-rose-500 transition text-lg leading-none">&times;</button>
              </div>

              <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                ${Utils.escapeHtml(n.title)}
              </h4>

              ${n.content ? `<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">${Utils.escapeHtml(n.content)}</p>` : ''}

              ${filesHtml}
            </div>

            <div class="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] text-slate-400">
              Saved ${Utils.formatDate(n.createdAt ? n.createdAt.split('T')[0] : '')}
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-black text-slate-900 dark:text-white">Study Notes & Files</h2>
            <button onclick="App.openModal('modal-add-note')" class="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition" title="Write Note">+</button>
          </div>
          <span class="text-xs text-slate-400 font-bold">${allNotes.length} notes</span>
        </div>

        <!-- Subject bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject:</span>
            <select id="notes-subject-select" onchange="NotesView.changeSubject(this.value)" class="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none">
              ${subjects.map(s => `<option value="${Utils.escapeHtml(s)}" ${s === this.currentSubject ? 'selected' : ''}>${Utils.escapeHtml(s)}</option>`).join('')}
            </select>
            <button onclick="NotesView.deleteCurrentSubject()" title="Delete Subject" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition">🗑️</button>
          </div>
          <form onsubmit="NotesView.handleCreateSubject(event)" class="flex items-center gap-1.5 w-full sm:w-auto">
            <input type="text" id="notes-new-subject-input" placeholder="+ New Subject…" required class="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none">
            <button type="submit" class="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shrink-0">Create</button>
          </form>
        </div>

        <!-- Folders bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button onclick="NotesView.changeFolder('ALL')" class="px-3 py-1 rounded-xl text-xs font-bold transition ${this.currentFolder === 'ALL' ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">All</button>
            ${folders.map(f => `
              <div class="flex items-center rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 ${this.currentFolder === f ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">
                <button onclick="NotesView.changeFolder('${Utils.escapeHtml(f)}')" class="px-2.5 py-1 text-xs font-bold">📁 ${Utils.escapeHtml(f)}</button>
                <button onclick="NotesView.deleteFolderConfirm('${Utils.escapeHtml(f)}')" title="Delete folder" class="px-1.5 py-1 text-xs text-rose-400 hover:text-rose-600 transition">&times;</button>
              </div>
            `).join('')}
          </div>
          <form onsubmit="NotesView.handleCreateFolder(event)" class="flex items-center gap-1.5">
            <input type="text" id="notes-new-folder-input" placeholder="+ Add folder…" required class="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none">
            <button type="submit" class="px-2.5 py-1 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold transition">Add</button>
          </form>
        </div>

        <!-- Notes grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${notesHtml}
        </div>

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
    const input = document.getElementById('notes-new-subject-input');
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
    const input = document.getElementById('notes-new-folder-input');
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
    const listEl = document.getElementById('note-pending-files-list');
    if (!input.files || input.files.length === 0) {
      if (listEl) listEl.innerHTML = '';
      return;
    }

    const files = Array.from(input.files);
    let loaded = 0;

    if (listEl) listEl.innerHTML = `<p class="text-[11px] text-slate-400">Loading ${files.length} file(s)…</p>`;

    files.forEach((file) => {
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
      const kb = Math.round(f.size / 1024);
      return `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          ${f.isImage ? `<img src="${f.data}" class="h-8 w-8 rounded-lg object-cover shrink-0">` : `<span class="text-lg shrink-0">📄</span>`}
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">${Utils.escapeHtml(f.name)}</span>
          <span class="text-[10px] text-slate-400 shrink-0">${kb} KB</span>
          <button type="button" onclick="NotesView._removePending(${i})" class="text-rose-400 hover:text-rose-600 text-xs shrink-0">&times;</button>
        </div>`;
    }).join('');
  },

  _removePending(idx) {
    this.pendingFiles.splice(idx, 1);
    const listEl = document.getElementById('note-pending-files-list');
    this._renderPendingList(listEl);
  },

  async handleAddNoteModal(e) {
    e.preventDefault();
    const title = document.getElementById('note-title-modal').value.trim();
    const content = document.getElementById('note-content-modal').value.trim();
    const folder = document.getElementById('note-folder-modal').value;
    if (!title) return;

    // Save all pending files to IndexedDB
    const savedFiles = [];
    for (const pf of this.pendingFiles) {
      const fileId = 'file-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      if (window.DB) {
        await window.DB.saveFile(fileId, { name: pf.name, type: pf.type, size: pf.size, data: pf.data });
      }
      savedFiles.push({ fileId, fileName: pf.name, isImage: pf.isImage, previewUrl: pf.isImage ? pf.data : null });
    }

    Storage.addNote({
      subject: this.currentSubject,
      folder,
      title,
      content,
      files: savedFiles
    });

    this.pendingFiles = [];
    App.closeModal('modal-add-note');
    Utils.showToast(`Note saved${savedFiles.length ? ' with ' + savedFiles.length + ' file(s)' : ''}!`, 'success');
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

  deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    Storage.deleteNote(id);
    Utils.showToast('Note deleted', 'info');
    this.render();
  }
};

window.NotesView = NotesView;
