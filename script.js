const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const faDigits = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const weekdayNames = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه','شنبه'];
const shortWeekdays = ['ش','ی','د','س','چ','پ','ج'];
const persianMonthNames = ['جنوری','فبروری','مارچ','اپریل','می','جون','جولای','آگست','سپتامبر','اکتوبر','نوامبر','دسمبر'];
const categories = {
  'مطالعه': { icon:'ri-book-open-line', subtitle:'مطالعه و تمرین کدها' },
  'ورزش': { icon:'ri-heart-pulse-line', subtitle:'تمرین و سلامتی' },
  'زبان': { icon:'ri-translate-2', subtitle:'مکالمه و لغات جدید' },
  'شخصی': { icon:'ri-code-s-slash-line', subtitle:'کارهای شخصی' },
  'پروژه': { icon:'ri-folder-3-line', subtitle:'توسعه برنامه و پروژه' }
};
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const sameDay = (a,b) => dateKey(a) === dateKey(b);
function getSaturday(date) { const d = new Date(date.getFullYear(),date.getMonth(),date.getDate()); d.setDate(d.getDate()-((d.getDay()+1)%7)); d.setHours(0,0,0,0); return d; }
function readTasks() {
  try { const data=JSON.parse(localStorage.getItem('daily-planner-tasks-v2')||'[]'); return Array.isArray(data) ? data.filter(t=>t&&typeof t.id==='string'&&typeof t.name==='string'&&Array.isArray(t.completedDates)&&typeof t.createdAt==='string').map(t=>({...t,time:t.time||'',category:t.category||'شخصی',archived:!!t.archived})) : []; }
  catch { return []; }
}
let tasks=readTasks(), currentFilter='all', selectedCalendarDate=new Date(), calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
const taskForm=$('#task-form'), taskInput=$('#task-input'), taskTime=$('#task-time'), taskCategory=$('#task-category'), taskList=$('#task-list'), searchInput=$('#search-input');
function saveTasks(){
  try {
    localStorage.setItem('daily-planner-tasks-v2', JSON.stringify(tasks));
  } catch {
    alert('ذخیره‌سازی مرورگر در دسترس نیست.');
  }
  saveCloudData();
}
function isCompleted(task,date){ return (task.completedDates||[]).includes(dateKey(date)); }
function setCompleted(task,date,done){ const key=dateKey(date); task.completedDates=(task.completedDates||[]).filter(d=>d!==key); if(done)task.completedDates.push(key); saveTasks(); renderAll(); }
function activeTasks(){ return tasks.filter(t=>!t.archived); }
function getCurrentWeekDays(){ const start=getSaturday(new Date()); return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;}); }
function weeklyStats(task){const now=new Date();now.setHours(0,0,0,0);const days=getCurrentWeekDays();const elapsed=days.filter(d=>d.getDay()!==5&&d<=now);const completed=elapsed.filter(d=>isCompleted(task,d)).length;return {days,completed,elapsed:elapsed.length,percent:elapsed.length?Math.round(completed/elapsed.length*100):0};}
function renderHeaderAndStats(){
 const now=new Date(), todayTasks=activeTasks().filter(t=>t.createdAt<=dateKey(now)), done=todayTasks.filter(t=>isCompleted(t,now)).length, percent=todayTasks.length?Math.round(done/todayTasks.length*100):0;
 $('#today-label').textContent=`${weekdayNames[now.getDay()]}، ${faDigits(now.toLocaleDateString('fa-IR',{year:'numeric',month:'long',day:'numeric'}))}`;
 $('#today-percent').textContent=`${faDigits(percent)}٪`; $('#today-progress-bar').style.width=`${percent}%`; $('#today-progress-text').textContent=todayTasks.length?`${faDigits(done)} کار از ${faDigits(todayTasks.length)} کار انجام شده است.`:'هنوز کاری اضافه نکرده‌ای.'; $('#done-count').textContent=faDigits(done); $('#remaining-count').textContent=faDigits(todayTasks.length-done);
}
function makeTaskRow(task, compact=false){
 const meta=categories[task.category]||categories['شخصی'], row=document.createElement('article'); row.className=`task-row${isCompleted(task,new Date())?' is-done':''}`; row.dataset.taskId=task.id;
 const check=document.createElement('input');check.type='checkbox';check.className='task-check';check.checked=isCompleted(task,new Date());check.setAttribute('aria-label','علامت‌گذاری به‌عنوان انجام‌شده');check.addEventListener('change',()=>setCompleted(task,new Date(),check.checked));
 const symbol=document.createElement('span');symbol.className='task-symbol';symbol.innerHTML=`<i class="${meta.icon}"></i>`;
 const main=document.createElement('div');main.className='task-main';const title=document.createElement('span');title.className='task-title';title.textContent=task.name;const sub=document.createElement('span');sub.className='task-subtitle';sub.textContent=meta.subtitle;main.append(title,sub);
 const cat=document.createElement('span');cat.className='category-tag';cat.textContent=task.category;
 const time=document.createElement('span');time.className='task-time-text';time.innerHTML=`<i class="ri-time-line"></i> ${task.time?faDigits(task.time):'بدون زمان'}`;
 const del=document.createElement('button');del.type='button';del.className='row-action delete';del.title='حذف از فهرست';del.innerHTML='<i class="ri-delete-bin-line"></i>';del.addEventListener('click',()=>{if(confirm(`کار «${task.name}» از فهرست امروز برداشته شود؟ سابقه آن در آرشیو باقی می‌ماند.`)){task.archived=true;saveTasks();renderAll();renderHistory();}});
 row.append(check,symbol,main,cat,time,del);return row;
}
function renderTasks(){
 const active=activeTasks(), query=(searchInput?.value||'').trim().toLocaleLowerCase(), today=new Date(); taskList.replaceChildren();
 const filtered=active.filter(t=>(currentFilter==='all'||(currentFilter==='active'&&!isCompleted(t,today))||(currentFilter==='done'&&isCompleted(t,today)))&&t.name.toLocaleLowerCase().includes(query));
 filtered.forEach(t=>taskList.appendChild(makeTaskRow(t)));
 $('#task-total').textContent=`${faDigits(filtered.length)} کار`;
 $('#empty-state').classList.toggle('show',filtered.length===0);
 if(!filtered.length){$('#empty-state b').textContent=active.length?'کاری با این فیلتر پیدا نشد':'هنوز کاری اضافه نشده';$('#empty-state span').textContent=active.length?'عبارت جستجو یا فیلتر را تغییر بده.':'اولین کار امروزت را وارد کن.';}
 const copy=$('#tasks-page-list'); if(copy){copy.replaceChildren(); if(!active.length){const p=document.createElement('p');p.className='muted';p.textContent='هنوز کاری اضافه نشده است.';copy.appendChild(p);}else active.forEach(t=>copy.appendChild(makeTaskRow(t,true)));}
}
function renderCalendar(){const days=getCurrentWeekDays(),container=$('#week-calendar');container.replaceChildren();days.forEach((date,i)=>{const day=document.createElement('div');day.className='calendar-day';if(sameDay(date,new Date()))day.classList.add('today');if(date.getDay()===5)day.classList.add('friday');const n=document.createElement('span');n.textContent=shortWeekdays[i];const num=document.createElement('strong');num.textContent=faDigits(date.toLocaleDateString('fa-IR',{day:'numeric'}));day.append(n,num);container.appendChild(day);});}
function renderWeeklyReport(){const container=$('#weekly-report-list');if(!container)return;container.replaceChildren();const list=activeTasks();if(!list.length){const p=document.createElement('p');p.className='muted small';p.textContent='پس از افزودن کارها، گزارش هفتگی اینجا نمایش داده می‌شود.';container.appendChild(p);return;}const now=new Date();now.setHours(0,0,0,0);list.forEach(task=>{const stats=weeklyStats(task),item=document.createElement('article');item.className='weekly-item';const head=document.createElement('div');head.className='weekly-item-head';const name=document.createElement('span');name.className='weekly-item-name';name.textContent=task.name;const pct=document.createElement('strong');pct.className='weekly-percent';pct.textContent=`${faDigits(stats.percent)}٪`;head.append(name,pct);const bar=document.createElement('div');bar.className='weekly-bar';const fill=document.createElement('div');fill.className='weekly-bar-fill';fill.style.width=`${stats.percent}%`;bar.appendChild(fill);const grid=document.createElement('div');grid.className='weekly-days';stats.days.forEach((date,i)=>{const mark=document.createElement('div');mark.className='day-mark';const icon=document.createElement('span');icon.className='day-mark-icon';const label=document.createElement('span');label.textContent=shortWeekdays[i];if(date.getDay()===5){mark.classList.add('rest');icon.innerHTML='<i class="ri-moon-line"></i>';}else if(date>now){mark.classList.add('future');icon.innerHTML='<i class="ri-more-line"></i>';}else if(isCompleted(task,date)){mark.classList.add('done');icon.innerHTML='<i class="ri-check-line"></i>';}else if(sameDay(date,now)){mark.classList.add('today-pending');icon.innerHTML='<i class="ri-time-line"></i>';}else{mark.classList.add('missed');icon.innerHTML='<i class="ri-close-line"></i>';}mark.append(icon,label);grid.appendChild(mark);});item.append(head,bar,grid);container.appendChild(item);});}
function renderMonthCalendar(){const grid=$('#month-calendar-grid');if(!grid)return;grid.replaceChildren();const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth();$('#calendar-month-title').textContent=`${persianMonthNames[m]} ${faDigits(y)}`;const labels=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه'];labels.forEach(x=>{const el=document.createElement('div');el.className='month-weekday';el.textContent=x;grid.appendChild(el);});const first=new Date(y,m,1), offset=(first.getDay()+1)%7, start=new Date(y,m,1-offset), count=Math.ceil((offset+new Date(y,m+1,0).getDate())/7)*7;for(let i=0;i<count;i++){const d=new Date(start);d.setDate(start.getDate()+i);const cell=document.createElement('button');cell.type='button';cell.className='month-day';if(d.getMonth()!==m)cell.classList.add('outside');if(sameDay(d,new Date()))cell.classList.add('today');if(sameDay(d,selectedCalendarDate))cell.classList.add('selected');const number=document.createElement('strong');number.textContent=faDigits(d.toLocaleDateString('fa-IR',{day:'numeric'}));cell.appendChild(number);const countTasks=activeTasks().filter(t=>t.createdAt<=dateKey(d)).length;if(countTasks){const small=document.createElement('span');small.className='day-count';const done=activeTasks().filter(t=>t.createdAt<=dateKey(d)&&isCompleted(t,d)).length;small.textContent=`${faDigits(done)}/${faDigits(countTasks)} کار`;cell.appendChild(small);}cell.addEventListener('click',()=>{selectedCalendarDate=new Date(d);renderMonthCalendar();renderSelectedDateTasks();});grid.appendChild(cell);}renderSelectedDateTasks();}
function renderSelectedDateTasks(){const box=$('#selected-date-tasks');if(!box)return;box.replaceChildren();const title=document.createElement('h2');title.textContent=`کارهای ${faDigits(selectedCalendarDate.toLocaleDateString('fa-IR',{year:'numeric',month:'long',day:'numeric'}))}`;box.appendChild(title);const list=activeTasks().filter(t=>t.createdAt<=dateKey(selectedCalendarDate));if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent='برای این تاریخ کاری ثبت نشده است.';box.appendChild(p);return;}list.forEach(t=>{const p=document.createElement('p');p.textContent=`${isCompleted(t,selectedCalendarDate)?'✓':'○'} ${t.name} — ${isCompleted(t,selectedCalendarDate)?'انجام شده':'ثبت انجام ندارد'}`;box.appendChild(p);});}
function renderAll(){renderHeaderAndStats();renderTasks();renderCalendar();renderWeeklyReport();renderMonthCalendar();}
taskForm.addEventListener('submit',e=>{e.preventDefault();const name=taskInput.value.trim();if(!name)return;tasks.push({id:(window.crypto&&crypto.randomUUID)?crypto.randomUUID():`${Date.now()}-${Math.random()}`,name,time:taskTime.value,category:taskCategory.value,createdAt:dateKey(new Date()),completedDates:[],archived:false});saveTasks();taskForm.reset();taskInput.focus();renderAll();});
$$('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{currentFilter=btn.dataset.filter;$$('.filter-btn').forEach(b=>b.classList.toggle('active',b===btn));renderTasks();}));
searchInput.addEventListener('input',renderTasks);
$('#clear-completed').addEventListener('click',()=>{const key=dateKey(new Date());activeTasks().forEach(t=>t.completedDates=t.completedDates.filter(d=>d!==key));saveTasks();renderAll();});
function setTheme(){const light=document.body.classList.contains('light-theme');$$('#theme-toggle, [data-theme-button]').forEach(btn=>btn.innerHTML=`<i class="${light?'ri-moon-line':'ri-sun-line'}"></i>`);}
function toggleTheme(){document.body.classList.toggle('light-theme');const light=document.body.classList.contains('light-theme');try{localStorage.setItem('daily-planner-theme',light?'light':'dark');}catch{}setTheme();}
$$('#theme-toggle, [data-theme-button]').forEach(btn=>btn.addEventListener('click',toggleTheme));try{if(localStorage.getItem('daily-planner-theme')==='light')document.body.classList.add('light-theme');}catch{}setTheme();
const pages=['dashboard','tasks','calendar','weekly-report','history','backup'];function activatePage(page){const dashboard=$('#dashboard');dashboard.style.display=page==='dashboard'?'':'none';pages.forEach(name=>{const el=name==='dashboard'?dashboard:$(`[data-extra-page="${name}"]`);if(el){if(name==='dashboard')el.classList.toggle('active-page',page==='dashboard');else el.classList.toggle('active-page',name===page);}});$$('.nav-link').forEach(link=>link.classList.toggle('active',link.dataset.page===page));if(page==='history')renderHistory();if(page==='weekly-report')renderWeeklyReport();if(page==='calendar')renderMonthCalendar();if(page==='backup')updateBackupMessage('اطلاعات فعلی آمادهٔ پشتیبان‌گیری است.');window.scrollTo({top:0,behavior:'smooth'});}
$$('.nav-link[data-page]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const page=link.dataset.page;if(page==='dashboard'){activatePage('dashboard');return;}activatePage(page);}));
$('#calendar-prev').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderMonthCalendar();});$('#calendar-next').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderMonthCalendar();});
// Historical archive
const historyPage=$('[data-extra-page="history"]'), historyPeriod=$('#history-period'), historyMonth=$('#history-month'), historyYear=$('#history-year'), historyDateLabel=$('#history-date-label'), nowHistory=new Date();
for(let m=0;m<12;m++){const o=document.createElement('option');o.value=String(m);o.textContent=persianMonthNames[m];historyMonth.appendChild(o);}for(let y=nowHistory.getFullYear()-5;y<=nowHistory.getFullYear()+1;y++){const o=document.createElement('option');o.value=String(y);o.textContent=faDigits(y);historyYear.appendChild(o);}historyMonth.value=String(nowHistory.getMonth());historyYear.value=String(nowHistory.getFullYear());
historyPeriod.addEventListener('change',()=>{historyDateLabel.firstChild.textContent=historyPeriod.value==='week'?'تاریخ هفته':historyPeriod.value==='year'?'ماه نمونه':'ماه';historyMonth.disabled=historyPeriod.value==='year';renderHistory();});historyMonth.addEventListener('change',renderHistory);historyYear.addEventListener('change',renderHistory);$('#history-show').addEventListener('click',renderHistory);
function getHistoryDates(){const year=Number(historyYear.value),month=Number(historyMonth.value),mode=historyPeriod.value;if(mode==='year')return{start:new Date(year,0,1),end:new Date(year+1,0,1),title:`گزارش سال ${faDigits(year)}`};if(mode==='week'){const start=getSaturday(new Date(year,month,1)),end=new Date(start);end.setDate(start.getDate()+7);return{start,end,title:`هفتهٔ آغازشده در ${faDigits(start.toLocaleDateString('fa-IR'))}`};}return{start:new Date(year,month,1),end:new Date(year,month+1,1),title:`گزارش ${persianMonthNames[month]} ${faDigits(year)}`};}
function renderHistory(){if(!historyPage)return;const {start,end,title}=getHistoryDates();$('#history-detail-title').textContent=title;const dates=[],cursor=new Date(start),today=new Date();today.setHours(0,0,0,0);while(cursor<end&&cursor<=today){if(cursor.getDay()!==5)dates.push(new Date(cursor));cursor.setDate(cursor.getDate()+1);}let done=0,total=0;const details=$('#history-details');details.replaceChildren();if(!tasks.length){const p=document.createElement('p');p.className='muted';p.textContent='هنوز کاری برای نمایش در آرشیو وجود ندارد.';details.appendChild(p);}tasks.forEach(t=>{const eligible=dates.filter(d=>dateKey(d)>=t.createdAt),success=eligible.filter(d=>isCompleted(t,d)),pct=eligible.length?Math.round(success.length/eligible.length*100):0;done+=success.length;total+=eligible.length;const card=document.createElement('article');card.className='history-record';const head=document.createElement('div');head.className='history-record-head';const name=document.createElement('strong');name.textContent=t.name+(t.archived?' (آرشیوشده)':'');const percent=document.createElement('strong');percent.textContent=`${faDigits(pct)}٪`;head.append(name,percent);const meta=document.createElement('small');meta.textContent=`${t.category} · ${faDigits(success.length)} از ${faDigits(eligible.length)} روز کاری`;const track=document.createElement('div');track.className='history-record-track';const fill=document.createElement('div');fill.className='history-record-fill';fill.style.width=`${pct}%`;track.appendChild(fill);const chips=document.createElement('div');chips.className='history-record-days';eligible.forEach(d=>{const chip=document.createElement('span');chip.className=`history-day-chip${isCompleted(t,d)?' done':''}`;chip.textContent=`${faDigits(d.toLocaleDateString('fa-IR',{day:'numeric',month:'short'}))}: ${isCompleted(t,d)?'انجام شد':'انجام نشد'}`;chips.appendChild(chip);});card.append(head,meta,track,chips);details.appendChild(card);});const pct=total?Math.round(done/total*100):0;$('#history-percent').textContent=`${faDigits(pct)}٪`;$('#history-progress').style.width=`${pct}%`;$('#history-summary').textContent=total?`${faDigits(done)} ثبت موفق از ${faDigits(total)} فرصت کاری در این بازه.`:'در این بازه روز کاری ثبت‌شده‌ای وجود ندارد.';$('#history-done').textContent=faDigits(done);$('#history-days').textContent=faDigits(dates.length);$('#history-tasks').textContent=faDigits(tasks.length);}
function updateBackupMessage(message){const node=$('#backup-message');if(node)node.textContent=message;}
$('#backup-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'Daily Planner',version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`daily-planner-backup-${dateKey(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);updateBackupMessage('نسخه پشتیبان دانلود شد. فایل را در جای امن نگه‌دار.');});
$('#backup-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text()),incoming=Array.isArray(data)?data:data.tasks;const valid=Array.isArray(incoming)&&incoming.every(t=>t&&typeof t.id==='string'&&typeof t.name==='string'&&typeof t.createdAt==='string'&&Array.isArray(t.completedDates));if(!valid)throw Error('invalid');if(!confirm('اطلاعات فعلی با اطلاعات داخل نسخه پشتیبان جایگزین شود؟'))return;tasks=incoming.map(t=>({...t,time:t.time||'',category:t.category||'شخصی',archived:!!t.archived,completedDates:[...new Set(t.completedDates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))]}));saveTasks();renderAll();renderHistory();updateBackupMessage(`بازیابی موفق بود؛ ${faDigits(tasks.length)} کار و سوابق آن وارد شد.`);}catch{updateBackupMessage('این فایل نسخه پشتیبان معتبر نیست. فایل JSON برنامه را انتخاب کن.');}finally{e.target.value='';}});
// Firebase + account authentication and per-user cloud sync
const firebaseConfig = {
  apiKey: "AIzaSyCveifhaGa5BCfbnwMclSooDdmqnreS6w8",
  authDomain: "daily-planner-app-84d29.firebaseapp.com",
  projectId: "daily-planner-app-84d29",
  storageBucket: "daily-planner-app-84d29.firebasestorage.app",
  messagingSenderId: "903789534564",
  appId: "1:903789534564:web:b5d4d9142300a7f175ee71"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const accountButton = $('#account-button');
const accountDialog = $('#account-dialog');
const accountClose = $('#account-close');
const accountForm = $('#account-form');
const accountEmail = $('#account-email');
const accountPassword = $('#account-password');
const accountSubmit = $('#account-submit');
const accountMessage = $('#account-message');
const accountLabel = $('#account-label');
const showLogin = $('#show-login');
const showRegister = $('#show-register');
const accountLogout = $('#account-logout');

let accountMode = 'login';
let currentUser = null;
let cloudReady = false;
let applyingCloudData = false;
let cloudSaveTimer = null;
let unsubscribeCloud = null;
let cloudLoadToken = 0;

function showAccountMessage(message, isError = false) {
  if (!accountMessage) return;
  accountMessage.textContent = message;
  accountMessage.style.color = isError ? 'var(--red, #ff526a)' : '';
}

function setAccountMode(mode) {
  accountMode = mode;
  if (accountSubmit) accountSubmit.textContent = mode === 'login' ? 'ورود' : 'ثبت‌نام';
  if (showLogin) showLogin.className = mode === 'login' ? 'primary-button' : 'secondary-button';
  if (showRegister) showRegister.className = mode === 'register' ? 'primary-button' : 'secondary-button';
  if (accountPassword) accountPassword.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  showAccountMessage('');
}

function openAccountDialog() {
  if (!accountDialog) return;
  accountDialog.hidden = false;
  accountClose?.focus();
  if (currentUser) showAccountMessage(`وارد شده‌ای: ${currentUser.email || ''}`);
}

function closeAccountDialog() {
  if (!accountDialog) return;
  accountDialog.hidden = true;
  accountButton?.focus();
}

function updateAccountUI(user) {
  currentUser = user || null;
  if (accountLabel) accountLabel.textContent = user ? (user.email || 'حساب کاربری') : 'حساب کاربری';
  if (accountForm) accountForm.hidden = !!user;
  if (accountLogout) accountLogout.hidden = !user;
  if (!user) {
    showAccountMessage('');
    setAccountMode('login');
  } else {
    showAccountMessage(`وارد شده‌ای: ${user.email || ''}`);
  }
}

function accountErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'این ایمیل قبلاً ثبت‌نام شده است.',
    'auth/invalid-email': 'ایمیل معتبر نیست.',
    'auth/weak-password': 'رمز عبور باید حداقل ۶ حرف باشد.',
    'auth/invalid-credential': 'ایمیل یا رمز عبور اشتباه است.',
    'auth/user-not-found': 'این حساب پیدا نشد.',
    'auth/wrong-password': 'رمز عبور اشتباه است.',
    'auth/network-request-failed': 'اتصال اینترنت را بررسی کن.',
    'auth/too-many-requests': 'تلاش‌های زیاد؛ کمی بعد دوباره امتحان کن.',
    'permission-denied': 'دسترسی ابری مجاز نیست؛ قوانین Firestore را بررسی کن.'
  };
  return messages[code] || 'عملیات انجام نشد. اتصال اینترنت و تنظیمات Firebase را بررسی کن.';
}

function normalizeCloudTasks(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(t => t && typeof t.id === 'string' && typeof t.name === 'string'
      && Array.isArray(t.completedDates) && typeof t.createdAt === 'string')
    .map(t => ({
      ...t,
      time: t.time || '',
      category: t.category || 'شخصی',
      archived: !!t.archived,
      completedDates: [...new Set(t.completedDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
    }));
}

async function loadUserCloudData(user) {
  const token = ++cloudLoadToken;
  const ref = db.doc(`users/${user.uid}/planner/state`);
  const snapshot = await ref.get();

  // Prevent an earlier account's slower request from overwriting the current account.
  if (token !== cloudLoadToken || !auth.currentUser || auth.currentUser.uid !== user.uid) return;

  if (snapshot.exists) {
    tasks = normalizeCloudTasks(snapshot.data().tasks);
  } else {
    // First sign-in for this account: preserve and copy this browser's existing tasks.
    tasks = normalizeCloudTasks(tasks);
    await ref.set({
      tasks,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  try {
    localStorage.setItem('daily-planner-tasks-v2', JSON.stringify(tasks));
  } catch {}

  renderAll();
  renderHistory();
  cloudReady = true;

  if (unsubscribeCloud) unsubscribeCloud();
  unsubscribeCloud = ref.onSnapshot(snapshotNow => {
    if (!snapshotNow.exists || !currentUser || currentUser.uid !== user.uid
        || snapshotNow.metadata.hasPendingWrites) return;

    const remoteTasks = normalizeCloudTasks(snapshotNow.data().tasks);
    applyingCloudData = true;
    tasks = remoteTasks;
    try {
      localStorage.setItem('daily-planner-tasks-v2', JSON.stringify(tasks));
    } catch {}
    renderAll();
    renderHistory();
    applyingCloudData = false;
  }, error => {
    applyingCloudData = false;
    showAccountMessage(accountErrorMessage(error), true);
  });
}

function saveCloudData() {
  if (!currentUser || !cloudReady || applyingCloudData) return;
  clearTimeout(cloudSaveTimer);

  const uid = currentUser.uid;
  const tasksToSave = normalizeCloudTasks(tasks);

  cloudSaveTimer = setTimeout(async () => {
    if (!currentUser || currentUser.uid !== uid || !cloudReady || applyingCloudData) return;
    try {
      await db.doc(`users/${uid}/planner/state`).set({
        tasks: tasksToSave,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      showAccountMessage(accountErrorMessage(error), true);
    }
  }, 450);
}

accountButton?.addEventListener('click', openAccountDialog);
accountClose?.addEventListener('click', closeAccountDialog);
accountDialog?.addEventListener('click', event => {
  if (event.target === accountDialog) closeAccountDialog();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && accountDialog && !accountDialog.hidden) closeAccountDialog();
});

showLogin?.addEventListener('click', () => setAccountMode('login'));
showRegister?.addEventListener('click', () => setAccountMode('register'));

accountForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const email = accountEmail?.value.trim() || '';
  const password = accountPassword?.value || '';

  if (!email || password.length < 6) {
    showAccountMessage('ایمیل و رمز عبور حداقل ۶ حرفی را وارد کن.', true);
    return;
  }

  if (accountSubmit) accountSubmit.disabled = true;
  showAccountMessage('لطفاً صبر کن...');

  try {
    if (accountMode === 'register') {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    showAccountMessage('ورود موفق بود؛ اطلاعات در حال بارگذاری است.');
  } catch (error) {
    showAccountMessage(accountErrorMessage(error), true);
  } finally {
    if (accountSubmit) accountSubmit.disabled = false;
  }
});

accountLogout?.addEventListener('click', async () => {
  try {
    cloudReady = false;
    cloudLoadToken++;
    clearTimeout(cloudSaveTimer);
    if (unsubscribeCloud) unsubscribeCloud();
    unsubscribeCloud = null;
    await auth.signOut();
    closeAccountDialog();
  } catch (error) {
    showAccountMessage(accountErrorMessage(error), true);
  }
});

auth.onAuthStateChanged(async user => {
  cloudReady = false;
  cloudLoadToken++;
  clearTimeout(cloudSaveTimer);
  if (unsubscribeCloud) unsubscribeCloud();
  unsubscribeCloud = null;

  updateAccountUI(user);
  if (!user) return;

  try {
    await loadUserCloudData(user);
    if (currentUser?.uid === user.uid) showAccountMessage('حساب متصل است و اطلاعات همگام‌سازی شد.');
  } catch (error) {
    showAccountMessage(accountErrorMessage(error), true);
  }
});

renderAll();
