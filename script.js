/* Taisen Docs — Improved menus, comments, suggestions, versions, exports */

/* Elements */
const EDIT_KEY = 'taisen_doc_v3';
const editor = document.getElementById('editor');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const textColor = document.getElementById('textColor');
const highlightColor = document.getElementById('highlightColor');
const zoomSelect = document.getElementById('zoom');
const savedAt = document.getElementById('savedAt');
const wordCountEl = document.getElementById('wordCount');
const charCountEl = document.getElementById('charCount');
const commentsPanel = document.getElementById('commentsPanel');
const commentsList = document.getElementById('commentsList');
const imgInput = document.getElementById('imgInput');
const versionsList = document.getElementById('versionsList');

let suggestMode = false;
let versions = JSON.parse(localStorage.getItem('taisen_versions') || '[]');
let comments = JSON.parse(localStorage.getItem('taisen_comments') || '[]');
let suggestions = JSON.parse(localStorage.getItem('taisen_suggestions') || '[]');
let menuTimers = {}; // for hover delays

/* ---------- MENU hover & keyboard accessibility ---------- */
document.querySelectorAll('.menu').forEach(menu => {
  const dropdown = menu.querySelector('.menu-dropdown');
  // open/close with hover using a short delay
  menu.addEventListener('mouseenter', () => {
    clearTimeout(menuTimers[menu.dataset.menu]);
    dropdown.style.display = 'block';
    menu.setAttribute('aria-expanded', 'true');
  });
  menu.addEventListener('mouseleave', () => {
    menuTimers[menu.dataset.menu] = setTimeout(() => {
      dropdown.style.display = 'none';
      menu.setAttribute('aria-expanded', 'false');
    }, 200); // 200ms delay to allow cursor moving into dropdown
  });
  dropdown.addEventListener('mouseenter', () => {
    clearTimeout(menuTimers[menu.dataset.menu]);
  });
  dropdown.addEventListener('mouseleave', () => {
    menuTimers[menu.dataset.menu] = setTimeout(() => {
      dropdown.style.display = 'none';
      menu.setAttribute('aria-expanded', 'false');
    }, 200);
  });

  // keyboard: Enter or ArrowDown opens
  menu.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === 'ArrowDown') {
      dropdown.style.display = 'block';
      menu.setAttribute('aria-expanded','true');
      dropdown.querySelector('button')?.focus();
      e.preventDefault();
    }
    if(e.key === 'Escape') {
      dropdown.style.display = 'none';
      menu.setAttribute('aria-expanded','false');
      menu.focus();
    }
  });
});

/* ---------- exec wrappers & formatting ---------- */
function doCmd(cmd, val = null) {
  document.execCommand(cmd, false, val);
  editor.focus();
}
function formatBlock(tag) {
  if (tag === 'P') document.execCommand('formatBlock', false, '<P>');
  else document.execCommand('formatBlock', false, `<${tag}>`);
}
fontFamily?.addEventListener('change', e => document.execCommand('fontName', false, e.target.value));
fontSize?.addEventListener('change', e => document.execCommand('fontSize', false, e.target.value));
textColor?.addEventListener('input', e => document.execCommand('foreColor', false, e.target.value));
highlightColor?.addEventListener('input', e => { document.execCommand('hiliteColor', false, e.target.value); document.execCommand('backColor', false, e.target.value); });

/* ---------- Insert helpers ---------- */
function insertLink() {
  const url = prompt('Enter URL (include http(s)://):');
  if (!url) return;
  const sel = window.getSelection();
  const txt = sel && sel.toString() ? sel.toString() : url;
  document.execCommand('insertHTML', false, `<a href="${escapeHtmlAttr(url)}" target="_blank">${escapeHtml(txt)}</a>`);
}

function triggerImage() {
  imgInput.value = '';
  imgInput.onchange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => document.execCommand('insertImage', false, ev.target.result);
    reader.readAsDataURL(file);
  };
  imgInput.click();
}

function insertTablePrompt() {
  const r = parseInt(prompt('Rows', '2'), 10) || 2;
  const c = parseInt(prompt('Cols', '2'), 10) || 2;
  insertTable(r, c);
}
function insertTable(rows, cols) {
  let html = '<table style="border-collapse:collapse;width:100%">';
  for(let i=0;i<rows;i++){
    html += '<tr>';
    for(let j=0;j<cols;j++){
      html += '<td contenteditable="true" style="border:1px solid #ddd;padding:8px"></td>';
    }
    html += '</tr>';
  }
  html += '</table><p></p>';
  document.execCommand('insertHTML', false, html);
}
function insertHorizontalRule(){ document.execCommand('insertHTML', false, '<hr/>'); }
function insertPageBreak(){ document.execCommand('insertHTML', false, '<div style="page-break-after:always"><!--pagebreak--></div>'); }

/* ---------- Find & Replace ---------- */
const findModal = document.getElementById('findModal');
function openFindReplace(){ findModal.classList.remove('hidden'); document.getElementById('findInput').focus(); }
function closeFindReplace(){ findModal.classList.add('hidden'); }
let lastRange = null;
function findNext(){
  const needle = document.getElementById('findInput').value;
  if (!needle) return alert('Enter text to find');
  const r = findInNode(editor, needle, lastRange);
  if (r) { selectRange(r); lastRange = r; } else { alert('No more matches'); lastRange = null; }
}
function replaceOne(){
  if (!lastRange) { findNext(); return; }
  const repl = document.getElementById('replaceInput').value || '';
  lastRange.deleteContents(); lastRange.insertNode(document.createTextNode(repl)); lastRange = null;
}
function replaceAll(){
  const needle = document.getElementById('findInput').value;
  const repl = document.getElementById('replaceInput').value || '';
  if (!needle) return alert('Enter text to find');
  const re = new RegExp(escapeRegExp(needle), 'g');
  editor.innerHTML = editor.innerHTML.replace(re, repl);
  alert('Replace done');
}
function findInNode(container, text, afterRange){
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  let node, started = !afterRange;
  if (afterRange) {
    while((node = walker.nextNode())) if (node === afterRange.endContainer) { started = true; break; }
  } else walker.currentNode = container;
  while((node = walker.nextNode())) {
    const idx = node.nodeValue.toLowerCase().indexOf(text.toLowerCase());
    if (idx !== -1) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      return range;
    }
  }
  return null;
}
function selectRange(range) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); range.getBoundingClientRect && window.scrollTo({ top: window.scrollY + range.getBoundingClientRect().top - 140, behavior:'smooth' }); }
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* ---------- Comments & Suggestions ---------- */
function addCommentToSelection(){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0 || !sel.toString().trim()) return alert('Select text to comment');
  const range = sel.getRangeAt(0);
  const raw = sel.toString();
  const id = 'c' + Date.now();
  const span = document.createElement('span');
  span.className = 'commented';
  span.dataset.cid = id;
  range.surroundContents(span);
  const text = prompt('Comment text:','');
  const comment = { id, text, target: raw, ts: Date.now(), resolved: false, replies: [] };
  comments.push(comment); persistComments(); renderComments();
}

function addCommentFromPanel(){
  const text = document.getElementById('newCommentText').value.trim();
  if(!text) return;
  const id = 'c' + Date.now();
  comments.push({ id, text, target: 'From panel', ts: Date.now(), resolved:false, replies:[] });
  persistComments(); renderComments();
  document.getElementById('newCommentText').value = '';
}
function persistComments(){ localStorage.setItem('taisen_comments', JSON.stringify(comments)); }
function renderComments(){
  commentsList.innerHTML = '';
  comments.forEach(c => {
    const d = document.createElement('div'); d.className = 'comment-item';
    d.innerHTML = `<div><strong>Comment</strong> <small class="muted">${new Date(c.ts).toLocaleString()}</small></div>
      <div style="margin:6px 0">${escapeHtml(c.text)}</div>
      <div><button onclick="resolveComment('${c.id}')">Resolve</button></div>`;
    commentsList.appendChild(d);
  });
}
function resolveComment(id){
  comments = comments.map(c => c.id===id ? {...c, resolved:true} : c);
  persistComments(); renderComments();
}
function openCommentsPanel(){ commentsPanel.style.display = 'flex'; }
function closeCommentsPanel(){ commentsPanel.style.display = 'none'; }

/* ---------- Suggestions (lightweight) ---------- */
function toggleSuggestMode(){
  suggestMode = !suggestMode;
  document.getElementById('suggestToggle').style.background = suggestMode ? '#ffeeba' : '';
  alert('Suggest mode ' + (suggestMode ? 'enabled' : 'disabled') + '. Select text and propose replacement via Add Comment flow.');
}

/* ---------- Versions / History ---------- */
function saveDoc(){
  localStorage.setItem(EDIT_KEY, editor.innerHTML);
  const snap = { ts: Date.now(), html: editor.innerHTML };
  versions.unshift(snap);
  if (versions.length > 100) versions.pop();
  localStorage.setItem('taisen_versions', JSON.stringify(versions));
  savedAt.textContent = 'Saved at ' + new Date().toLocaleTimeString();
  renderVersions();
}
function openVersionHistory(){ document.getElementById('versionModal').classList.remove('hidden'); renderVersions(); }
function closeVersionHistory(){ document.getElementById('versionModal').classList.add('hidden'); }
function renderVersions(){
  versionsList.innerHTML = '';
  versions.forEach((v,i) => {
    const div = document.createElement('div'); div.style.padding='8px'; div.style.borderBottom='1px solid #eee';
    div.innerHTML = `<div><strong>${new Date(v.ts).toLocaleString()}</strong></div><div style="margin-top:6px"><button onclick="restoreVersion(${i})">Restore</button></div>`;
    versionsList.appendChild(div);
  });
}
function restoreVersion(idx){
  if(!confirm('Restore this version?')) return;
  editor.innerHTML = versions[idx].html;
  saveDoc();
  closeVersionHistory();
}

/* ---------- Exports ---------- */
async function exportToDocx() {
  const { Document, Packer, Paragraph } = window.docx;

  // Get editor content
  const editorContent = document.getElementById("editor").innerText;

  // Create DOCX
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [new Paragraph(editorContent)],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "document.docx";
  link.click();
}

function exportTxt(){
  const text = editor.innerText || editor.textContent || '';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, 'document.txt');
}
function exportPdf(){
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
  const wrapper = document.createElement('div'); wrapper.style.padding='20px'; wrapper.appendChild(clone);
  const opt = { margin: 0.5, filename: 'document.pdf', image: { type:'jpeg', quality:0.98 }, html2canvas:{scale:2}, jsPDF:{unit:'in',format:'letter',orientation:'portrait'} };
  html2pdf().set(opt).from(wrapper).save();
}
function printDoc(){
  const w = window.open('', '_blank');
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Print</title></head><body>' + editor.innerHTML + '</body></html>');
  w.document.close(); w.focus(); setTimeout(()=>w.print(), 500);
}

/* ---------- Zoom / layout / theme ---------- */
zoomSelect?.addEventListener('change', e => {
  editor.style.transformOrigin = '0 0';
  editor.style.transform = `scale(${e.target.value})`;
  editor.style.width = `${100 / parseFloat(e.target.value)}%`;
});
let printLayout = false;
function togglePrintLayout(){
  printLayout = !printLayout;
  if(printLayout){ editor.style.maxWidth='800px'; editor.style.margin='0 auto'; editor.style.boxShadow='none'; }
  else { editor.style.maxWidth=''; editor.style.margin=''; editor.style.boxShadow=''; }
}
function toggleTheme(){ document.body.classList.toggle('dark'); }

/* ---------- counts, autosave & load ---------- */
function updateCounts(){
  const text = editor.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCountEl.textContent = 'Words: ' + words;
  charCountEl.textContent = 'Chars: ' + text.length;
}
editor.addEventListener('input', () => { updateCounts(); });

function loadDoc(){
  const s = localStorage.getItem(EDIT_KEY);
  if(s) editor.innerHTML = s;
  comments = JSON.parse(localStorage.getItem('taisen_comments') || '[]');
  versions = JSON.parse(localStorage.getItem('taisen_versions') || '[]');
  suggestions = JSON.parse(localStorage.getItem('taisen_suggestions') || '[]');
  renderComments(); renderVersions(); updateCounts();
  savedAt.textContent = 'Loaded';
}
loadDoc();

setInterval(() => {
  localStorage.setItem(EDIT_KEY, editor.innerHTML);
  savedAt.textContent = 'Auto-saved ' + new Date().toLocaleTimeString();
}, 7000);

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDoc(); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); doCmd('bold'); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); doCmd('italic'); }
});

/* ---------- safe unload ---------- */
let initial = editor.innerHTML;
window.addEventListener('beforeunload', (e) => {
  if (editor.innerHTML !== initial) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- tiny helpers ---------- */
function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeHtmlAttr(s){ return (s+'').replace(/"/g,'&quot;').replace(/'/g,"&#39;"); }
