/* app.js
   Shared logic for LocalJobs prototype:
   - Simple localStorage auth (users, current user)
   - Jobs CRUD in localStorage
   - UI functions for each page (exposed via AppUI)
*/

/* -----------------------
   Storage keys & helpers
   ----------------------- */
const LS_USERS = 'lj_users_v1';
const LS_CURRENT = 'lj_current_v1';
const LS_JOBS = 'lj_jobs_v1';

function readJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { console.error('readJSON', e); return fallback; }
}
function writeJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }

function nowId(){ return 'j' + Date.now() + Math.random().toString(36).slice(2,6); }

/* -----------------------
   Auth: signup/login/logout
   ----------------------- */
const Auth = {
  users() { return readJSON(LS_USERS, []); },
  saveUsers(list) { writeJSON(LS_USERS, list); },

  getCurrent() { return readJSON(LS_CURRENT, null); },
  setCurrent(user) { writeJSON(LS_CURRENT, user); },

  signup(name, email, password) {
    const users = this.users();
    if (users.find(u => u.email === email)) return { ok:false, msg:'Email already used' };
    const user = { id: 'u' + Date.now(), name, email, password };
    users.push(user);
    this.saveUsers(users);
    this.setCurrent({ id: user.id, name: user.name, email: user.email });
    return { ok:true, user };
  },

  login(email, password) {
    const users = this.users();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { ok:false, msg:'Invalid email or password' };
    this.setCurrent({ id: user.id, name: user.name, email: user.email });
    return { ok:true, user };
  },

  logout() {
    localStorage.removeItem(LS_CURRENT);
  }
};

/* -----------------------
   Jobs storage & logic
   ----------------------- */
const Jobs = {
  list() { return readJSON(LS_JOBS, sampleJobs()); },
  save(list) { writeJSON(LS_JOBS, list); },

  add(job) {
    const list = this.list();
    list.unshift(job);
    this.save(list);
  },

  remove(jobId) {
    let list = this.list();
    list = list.filter(j => j.id !== jobId);
    this.save(list);
  },

  find(id) {
    return this.list().find(j => j.id === id);
  }
};

function sampleJobs(){
  return [
    { id: 'sj1', title: 'Cut front & back lawn', category: 'Yard & Garden', description: 'Mow front and back lawn, trim edges and tidy hedge. Approx 1.5 hours.', price: 40, location:'Dublin', posterName: 'Mary', createdAt: Date.now()-86400000 },
    { id: 'sj2', title: 'Replace kitchen sink', category: 'Plumbing', description: 'Remove old sink and fit new stainless sink. Standard fittings expected.', price: 120, location:'Cork', posterName: 'Liam', createdAt: Date.now()-18000000 },
    { id: 'sj3', title: 'Small van rubbish removal', category: 'Waste & Removal', description: 'Remove garden waste and old furniture. 1-2 hours, help loading.', price: 60, location:'Galway', posterName: 'Aoife', createdAt: Date.now()-3600000 }
  ];
}

/* -----------------------
   UI helpers & behaviours
   ----------------------- */
const AppUI = {
  updateHeader() {
    const cur = Auth.getCurrent();
    const navUser = document.getElementById('nav-user');
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');
    if (!navUser) return;
    if (cur) {
      navUser.style.display = 'inline-block';
      navUser.textContent = 'Hi, ' + cur.name;
      if (navLogin) navLogin.style.display = 'none';
      if (navSignup) navSignup.style.display = 'none';
      // add logout option
      if (!document.getElementById('logoutBtn')) {
        const a = document.createElement('a');
        a.href = '#';
        a.id = 'logoutBtn';
        a.textContent = 'Log out';
        a.style.marginLeft = '10px';
        a.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); AppUI.updateHeader(); window.location.href = 'index.html'; });
        navUser.parentNode.appendChild(a);
      }
    } else {
      navUser.style.display = 'none';
      if (navLogin) navLogin.style.display = 'inline';
      if (navSignup) navSignup.style.display = 'inline';
      const lb = document.getElementById('logoutBtn');
      if (lb) lb.remove();
    }
  },

  /* Signup page wiring */
  initSignupPage() {
    this.updateHeader();
    const form = document.getElementById('signupForm');
    const suMsg = document.getElementById('suMsg');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('suName').value.trim();
      const email = document.getElementById('suEmail').value.trim().toLowerCase();
      const password = document.getElementById('suPassword').value;
      const res = Auth.signup(name, email, password);
      if (!res.ok) { suMsg.textContent = res.msg; return; }
      suMsg.textContent = 'Account created — signed in! Redirecting to Jobs...';
      this.updateHeader();
      setTimeout(() => window.location.href = 'jobs.html', 900);
    });
  },

  /* Login page wiring */
  initLoginPage() {
    this.updateHeader();
    const form = document.getElementById('loginForm');
    const liMsg = document.getElementById('liMsg');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('liEmail').value.trim().toLowerCase();
      const password = document.getElementById('liPassword').value;
      const res = Auth.login(email, password);
      if (!res.ok) { liMsg.textContent = res.msg; return; }
      liMsg.textContent = 'Logged in — redirecting to Jobs...';
      this.updateHeader();
      setTimeout(() => window.location.href = 'jobs.html', 700);
    });
  },

  /* Jobs page wiring */
  initJobsPage() {
    this.updateHeader();

    // Elements
    const jobsContainer = document.getElementById('jobsContainer');
    const noJobs = document.getElementById('noJobs');
    const postForm = document.getElementById('postForm');
    const postNotice = document.getElementById('postNotice');

    const searchQ = document.getElementById('searchQ');
    const filterCategory = document.getElementById('filterCategory');
    const sortBy = document.getElementById('sortBy');

    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMeta = document.getElementById('modalMeta');
    const modalDesc = document.getElementById('modalDesc');
    const openApply = document.getElementById('openApply');
    const shareJob = document.getElementById('shareJob');

    const applyModal = document.getElementById('applyModal');
    const closeApply = document.getElementById('closeApply');
    const applyForm = document.getElementById('applyForm');

    let activeJobId = null;

    function render() {
      const list = Jobs.list();
      let out = list.slice();

      // filters
      const q = (searchQ && searchQ.value || '').toLowerCase();
      const cat = (filterCategory && filterCategory.value) || 'All';
      if (cat && cat !== 'All') out = out.filter(j => j.category === cat);
      if (q) out = out.filter(j => (j.title + ' ' + j.description + ' ' + (j.posterName || '')).toLowerCase().includes(q));

      // sort
      const s = (sortBy && sortBy.value) || 'newest';
      if (s === 'newest') out.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
      else if (s === 'oldest') out.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
      else if (s === 'price_asc') out.sort((a,b) => (a.price||0) - (b.price||0));
      else if (s === 'price_desc') out.sort((a,b) => (b.price||0) - (a.price||0));

      jobsContainer.innerHTML = '';
      if (!out.length) { noJobs.style.display = 'block'; return; }
      noJobs.style.display = 'none';

      out.forEach(job => {
        const el = document.createElement('div');
        el.className = 'job-card';
        el.innerHTML = `
          <div>
            <strong>${escapeHtml(job.title)}</strong>
            <div class="job-meta">${escapeHtml(job.category)} • ${escapeHtml(job.location || '')}</div>
            <div class="muted small">${job.price ? '€' + escapeHtml(String(job.price)) : 'Price: negotiable'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-outline" data-id="${job.id}" data-action="view">View</button>
            ${Auth.getCurrent() && Auth.getCurrent().email === job.posterEmail ? `<button class="btn btn-ghost" data-id="${job.id}" data-action="delete">Delete</button>` : ''}
          </div>
        `;
        jobsContainer.appendChild(el);
      });
    }

    // helper to safely display text
    function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

    // Post form
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = Auth.getCurrent();
      if (!cur) { alert('You must be signed in to post a job.'); return; }
      const title = document.getElementById('postTitle').value.trim();
      const price = Number(document.getElementById('postPrice').value) || null;
      const category = document.getElementById('postCategory').value;
      const location = document.getElementById('postLocation').value.trim();
      const description = document.getElementById('postDescription').value.trim();
      if (!title || !description) { alert('Please complete title and description'); return; }
      const job = { id: nowId(), title, price, category, location, description, posterName: cur.name, posterEmail: cur.email, createdAt: Date.now() };
      Jobs.add(job);
      postForm.reset();
      render();
    });

    // Adjust post notice
    const cur = Auth.getCurrent();
    if (cur) postNotice.textContent = 'Signed in as ' + cur.name;
    else postNotice.textContent = 'Not signed in';

    // Delegate view/delete clicks
    jobsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'view') {
        const job = Jobs.find(id);
        if (!job) return;
        activeJobId = id;
        modalTitle.textContent = job.title;
        modalMeta.textContent = `${job.posterName || 'Unknown'} • ${job.location || 'Location not stated'} • ${job.price ? '€' + job.price : 'Price: negotiable'}`;
        modalDesc.textContent = job.description;
        modal.style.display = 'flex';
      } else if (action === 'delete') {
        if (!confirm('Delete this job?')) return;
        Jobs.remove(id);
        render();
      }
    });

    closeModal.addEventListener('click', () => modal.style.display = 'none');
    openApply.addEventListener('click', () => { modal.style.display = 'none'; if (!Auth.getCurrent()) { alert('Please sign in to apply'); return; } applyModal.style.display = 'flex'; });
    shareJob.addEventListener('click', () => { const url = window.location.href.split('#')[0] + '?job=' + activeJobId; navigator.clipboard && navigator.clipboard.writeText(url); alert('Link copied to clipboard'); });

    closeApply.addEventListener('click', () => applyModal.style.display = 'none');

    applyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = document.getElementById('applyMessage').value.trim();
      const contact = document.getElementById('applyContact').value.trim();
      if (!msg) { alert('Write a short message'); return; }
      // Prototype: store applications under job (simple) or just show alert
      alert('Application sent (prototype). Contact: ' + (contact || 'not provided'));
      applyForm.reset();
      applyModal.style.display = 'none';
    });

    // Filters
    if (searchQ) { searchQ.addEventListener('input', render); }
    if (filterCategory) { filterCategory.addEventListener('change', render); }
    if (sortBy) { sortBy.addEventListener('change', render); }

    // handle opening a specific job via ?job=id
    const params = new URLSearchParams(location.search);
    const initialJob = params.get('job');
    if (initialJob) {
      const j = Jobs.find(initialJob);
      if (j) {
        // open modal after render
        setTimeout(() => {
          activeJobId = initialJob;
          document.getElementById('modalTitle').textContent = j.title;
          document.getElementById('modalMeta').textContent = `${j.posterName || 'Unknown'} • ${j.location || 'Location not stated'} • ${j.price ? '€' + j.price : 'Price: negotiable'}`;
          document.getElementById('modalDesc').textContent = j.description;
          modal.style.display = 'flex';
        }, 400);
      }
    }

    render();
  },

  /* Simple init for pages that don't need extra wiring */
  init() { this.updateHeader(); }
};

/* Run header update on page load */
document.addEventListener('DOMContentLoaded', () => {
  AppUI.updateHeader();
});