let currentOrg = null;
let currentProject = null;
let throughputChart = null;
let refreshTimer = null;

window.addEventListener('dashboard:ready', async () => {
  await loadContext();
  setupNavigation();
  setupFilters();
  setupCreateForms();
  
  // Load overview data AND the queue filter on first load
  await loadOverview();
  await populateQueueFilter();
  loadCurrentPage();
  
  // Auto-refresh every 5 seconds for live dashboard feel
  refreshTimer = setInterval(() => {
    loadOverview(); // Always keep overview metrics fresh
    loadCurrentPage(); // Also refresh the visible page
  }, 5000);
});

// Any data mutation triggers a full refresh of overview + current page
window.addEventListener('data:changed', () => {
  loadOverview();
  populateQueueFilter();
  loadCurrentPage();
});

async function loadContext() {
  try {
    const orgs = await api.get('/organizations');
    
    if (orgs.length === 0) {
      return;
    }
    
    currentOrg = orgs[0].id;
    await loadProjects(currentOrg);
  } catch (err) {
    console.error("Failed to load context", err);
  }
}

async function loadProjects(orgId) {
  try {
    const projects = await api.get(`/projects?organizationId=${orgId}`);
    
    if (projects.length === 0) {
      currentProject = null;
      return;
    }
    
    currentProject = projects[0].id;
  } catch (err) {
    console.error("Failed to load projects", err);
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav
      document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update title
      document.getElementById('page-title').innerText = link.innerText;
      
      // Show target page
      const target = link.dataset.target;
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      document.getElementById(`page-${target}`).classList.remove('hidden');
      
      // Close sidebar on mobile
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('mobile-open');
      }
      
      loadCurrentPage();
    });
  });
}

function setupFilters() {
  document.getElementById('btn-refresh-jobs').addEventListener('click', loadJobs);
  
  // Auto-refresh jobs when dropdowns change
  document.getElementById('filter-queue').addEventListener('change', loadJobs);
  document.getElementById('filter-status').addEventListener('change', loadJobs);
  
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('job-modal').classList.add('hidden');
  });

  // Close modal buttons for queue + job create modals
  document.querySelectorAll('.modal .close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });
}

function setupCreateForms() {
  // ---- New Queue button ----
  document.getElementById('btn-new-queue').addEventListener('click', () => {
    if (!currentProject) {
      showToast('Please select a project first.', 'error');
      return;
    }
    document.getElementById('queue-modal').classList.remove('hidden');
  });

  // ---- Create Queue form ----
  document.getElementById('create-queue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById('queue-create-error');
    errDiv.innerText = '';

    const name = document.getElementById('queue-name').value.trim();
    const priority = parseInt(document.getElementById('queue-priority').value, 10);
    const concurrencyLimit = parseInt(document.getElementById('queue-concurrency').value, 10);

    if (!name) {
      errDiv.innerText = 'Queue name is required.';
      return;
    }

    try {
      await api.post('/queues', {
        name,
        projectId: currentProject,
        priority,
        concurrencyLimit,
      });
      document.getElementById('queue-modal').classList.add('hidden');
      document.getElementById('create-queue-form').reset();
      showToast('Queue created successfully!', 'success');
      window.dispatchEvent(new CustomEvent('data:changed', { detail: 'queues' }));
    } catch (err) {
      errDiv.innerText = err.message;
    }
  });

  // ---- New Job button ----
  document.getElementById('btn-new-job').addEventListener('click', async () => {
    // Populate the queue selector in the job form
    const jobQueueSelect = document.getElementById('job-queue-select');
    if (!currentProject) {
      showToast('Please select a project first.', 'error');
      return;
    }
    try {
      const queues = await api.get(`/queues?projectId=${currentProject}`);
      if (queues.length === 0) {
        showToast('Create a queue first before submitting a job.', 'error');
        return;
      }
      jobQueueSelect.innerHTML = queues.map(q => `<option value="${q.id}">${q.name}</option>`).join('');
      document.getElementById('create-job-modal').classList.remove('hidden');
    } catch (err) {
      showToast('Failed to load queues.', 'error');
    }
  });

  // ---- Create Job form ----
  document.getElementById('create-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById('job-create-error');
    errDiv.innerText = '';

    const queueId = document.getElementById('job-queue-select').value;
    const type = document.getElementById('job-type').value;
    const payloadStr = document.getElementById('job-payload').value.trim();
    const priority = parseInt(document.getElementById('job-priority').value, 10);
    const maxAttempts = parseInt(document.getElementById('job-max-attempts').value, 10);

    let payload = {};
    if (payloadStr) {
      try {
        payload = JSON.parse(payloadStr);
      } catch (parseErr) {
        errDiv.innerText = 'Invalid JSON in payload field.';
        return;
      }
    }

    try {
      await api.post('/jobs', {
        queueId,
        type,
        payload,
        priority,
        maxAttempts,
      });
      document.getElementById('create-job-modal').classList.add('hidden');
      document.getElementById('create-job-form').reset();
      showToast('Job submitted successfully!', 'success');
      window.dispatchEvent(new CustomEvent('data:changed', { detail: 'jobs' }));
    } catch (err) {
      errDiv.innerText = err.message;
    }
  });
}

function loadCurrentPage() {
  const currentNav = document.querySelector('.nav-links a.active').dataset.target;
  switch (currentNav) {
    case 'overview': return loadOverview();
    case 'queues': return loadQueues();
    case 'jobs': return loadJobs();
    case 'workers': return loadWorkers();
    case 'dlq': return loadDLQ();
  }
}

// -----------------------------------------------------------------------------
// DATA LOADERS
// -----------------------------------------------------------------------------

async function loadOverview() {
  try {
    const metrics = await api.get('/metrics');
    
    animateCounter('metric-queues', metrics.queues || 0);
    animateCounter('metric-workers', metrics.workers.active);
    animateCounter('metric-queued', metrics.jobs.queued);
    animateCounter('metric-running', metrics.jobs.running);
    animateCounter('metric-completed', metrics.jobs.completed);
    
    renderChart(metrics.jobs);
  } catch (err) {
    console.error("Failed to load metrics", err);
  }
}

function animateCounter(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  const current = parseInt(el.innerText) || 0;
  if (current === target) return;
  
  // Smooth count-up animation
  const duration = 400;
  const steps = 20;
  const increment = (target - current) / steps;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      el.innerText = target;
      clearInterval(timer);
    } else {
      el.innerText = Math.round(current + increment * step);
    }
  }, duration / steps);
  
  el.style.transform = 'scale(1.1)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
}

function renderChart(jobs) {
  const ctx = document.getElementById('throughputChart').getContext('2d');
  
  const data = {
    labels: ['Queued', 'Scheduled', 'Running', 'Completed', 'Failed', 'Dead Letter'],
    datasets: [{
      label: 'Job Distribution',
      data: [
        jobs.queued, jobs.scheduled, jobs.running, 
        jobs.completed, jobs.failed, jobs.deadLetter
      ],
      backgroundColor: [
        'rgba(99, 102, 241, 0.6)',
        'rgba(139, 92, 246, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(20, 184, 166, 0.6)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(107, 114, 128, 0.6)'
      ],
      borderColor: [
        '#6366f1', '#8b5cf6', '#10b981', '#14b8a6', '#ef4444', '#6b7280'
      ],
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false
    }]
  };
  
  if (throughputChart) {
    throughputChart.data = data;
    throughputChart.update('none'); // Update without animation for smoother refreshes
  } else {
    throughputChart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            padding: 12,
            cornerRadius: 8,
          }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(0,0,0,0.06)' }, 
            ticks: { color: '#64748b', stepSize: 1 }
          },
          x: { grid: { display: false }, ticks: { color: '#64748b' } }
        },
        animation: { duration: 500, easing: 'easeOutQuart' }
      }
    });
  }
}

async function populateQueueFilter() {
  if (!currentProject) return;
  try {
    const queues = await api.get(`/queues?projectId=${currentProject}`);
    const filterQueue = document.getElementById('filter-queue');
    const oldVal = filterQueue.value;
    filterQueue.innerHTML = '<option value="">All Queues</option>' + 
      queues.map(q => `<option value="${q.id}">${q.name}</option>`).join('');
    filterQueue.value = oldVal;
  } catch (err) {
    console.error("Failed to populate queue filter", err);
  }
}

async function loadQueues() {
  if (!currentProject) {
    document.querySelector('#queues-table tbody').innerHTML = `
      <tr><td colspan="6"><div class="empty-state">
        <h4>No project selected</h4>
        <p>Create a project to get started with queues.</p>
      </div></td></tr>`;
    return;
  }
  try {
    const queues = await api.get(`/queues?projectId=${currentProject}`);
    const tbody = document.querySelector('#queues-table tbody');
    
    // Also update jobs filter dropdown
    const filterQueue = document.getElementById('filter-queue');
    const oldVal = filterQueue.value;
    filterQueue.innerHTML = '<option value="">All Queues</option>' + 
      queues.map(q => `<option value="${q.id}">${q.name}</option>`).join('');
    filterQueue.value = oldVal;
    
    if (queues.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6"><div class="empty-state">
          <h4>No queues yet</h4>
          <p>Click "+ New Queue" to create your first queue.</p>
        </div></td></tr>`;
      return;
    }
    
    tbody.innerHTML = queues.map(q => `
      <tr>
        <td><strong>${q.name}</strong></td>
        <td>${q.priority}</td>
        <td>${q.concurrencyLimit}</td>
        <td><span class="badge ${q.isPaused ? 'failed' : 'running'}">${q.isPaused ? 'PAUSED' : 'ACTIVE'}</span></td>
        <td>${q._count.jobs || 0}</td>
        <td>
          <button class="btn small outline" onclick="toggleQueue('${q.id}', ${q.isPaused})">
            ${q.isPaused ? 'Resume' : 'Pause'}
          </button>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error("Failed to load queues", err);
  }
}

window.toggleQueue = async (queueId, isPaused) => {
  try {
    const action = isPaused ? 'resume' : 'pause';
    await api.post(`/queues/${queueId}/${action}`);
    showToast(`Queue successfully ${action}d.`, 'success');
    window.dispatchEvent(new CustomEvent('data:changed', { detail: 'queues' }));
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function loadJobs() {
  const queueId = document.getElementById('filter-queue').value;
  const status = document.getElementById('filter-status').value;
  
  let url = '/jobs?page=1&pageSize=50';
  if (queueId) url += `&queueId=${queueId}`;
  if (status) url += `&status=${status}`;
  
  try {
    const res = await api.get(url);
    const tbody = document.querySelector('#jobs-table tbody');
    
    if (!res || res.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6"><div class="empty-state">
          <h4>No jobs found</h4>
          <p>Submit a job using "+ Submit Job" or change your filters.</p>
        </div></td></tr>`;
      return;
    }
    
    tbody.innerHTML = res.map(j => `
      <tr>
        <td title="${j.id}">${j.id.substring(0, 8)}...</td>
        <td>${j.type}</td>
        <td><span class="badge ${getStatusClass(j.status)}">${j.status.toUpperCase()}</span></td>
        <td>${j.attemptCount} / ${j.maxAttempts}</td>
        <td>${new Date(j.createdAt).toLocaleString()}</td>
        <td>
          <button class="btn small outline" onclick="showJobDetail('${j.id}')">View</button>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error("Failed to load jobs", err);
  }
}

window.showJobDetail = async (id) => {
  try {
    const job = await api.get(`/jobs/${id}`);
    document.getElementById('job-detail-json').innerText = JSON.stringify(job, null, 2);
    document.getElementById('modal-title').innerText = `Job ${id.substring(0, 8)}`;
    document.getElementById('job-modal').classList.remove('hidden');
  } catch (err) {
    showToast("Failed to fetch job details", 'error');
  }
};

function getStatusClass(status) {
  if (['queued', 'scheduled'].includes(status)) return 'queued';
  if (['claimed', 'running'].includes(status)) return 'running';
  if (['completed'].includes(status)) return 'completed';
  return 'failed';
}

async function loadWorkers() {
  try {
    const workers = await api.get('/workers');
    const tbody = document.querySelector('#workers-table tbody');
    
    if (workers.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5"><div class="empty-state">
          <h4>No workers running</h4>
          <p>Start a worker process with: <code>npm run dev:worker</code></p>
        </div></td></tr>`;
      return;
    }
    
    tbody.innerHTML = workers.map(w => `
      <tr>
        <td><strong>${w.hostname}</strong></td>
        <td>${w.pid}</td>
        <td><span class="badge ${w.status === 'dead' ? 'failed' : w.status === 'idle' ? 'completed' : 'running'}">${w.status.toUpperCase()}</span></td>
        <td>${w.currentLoad} / ${w.concurrencyCapacity}</td>
        <td>${new Date(w.lastHeartbeatAt).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Failed to load workers", err);
  }
}

async function loadDLQ() {
  const tbody = document.querySelector('#dlq-table tbody');
  try {
    // Use the jobs endpoint filtered by dead_letter status
    const res = await api.get('/jobs?page=1&pageSize=20&status=dead_letter');
    if (!res || res.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5"><div class="empty-state">
          <h4>Dead Letter Queue is empty</h4>
          <p>Jobs that fail all retry attempts will appear here.</p>
        </div></td></tr>`;
      return;
    }
    tbody.innerHTML = res.map(j => `
      <tr>
        <td title="${j.id}">${j.id.substring(0, 8)}...</td>
        <td title="${j.queueId}">${j.queueId.substring(0, 8)}...</td>
        <td>Failed after ${j.attemptCount} attempts</td>
        <td>${new Date(j.updatedAt).toLocaleString()}</td>
        <td>
          <button class="btn small outline" onclick="showJobDetail('${j.id}')">View</button>
          <button class="btn small primary" onclick="replayJob('${j.id}')">Replay</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Failed to load DLQ", err);
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Failed to load DLQ data.</p></div></td></tr>`;
  }
}

window.replayJob = async (id) => {
  try {
    await api.post(`/jobs/${id}/replay`);
    showToast(`Job ${id.substring(0, 8)} replayed successfully!`, 'success');
    window.dispatchEvent(new CustomEvent('data:changed', { detail: 'jobs' }));
  } catch (err) {
    showToast(err.message, 'error');
  }
};
