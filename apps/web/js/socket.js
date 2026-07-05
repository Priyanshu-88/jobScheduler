let socket = null;

window.addEventListener('dashboard:ready', () => {
  if (socket) return;

  socket = io(window.location.origin);
  const statusIndicator = document.getElementById('ws-status');

  socket.on('connect', () => {
    console.log('WebSocket connected');
    statusIndicator.className = 'dot green';
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
    statusIndicator.className = 'dot red';
  });

  socket.on('job:created', (data) => {
    window.dispatchEvent(new CustomEvent('data:changed', { detail: 'jobs' }));
  });

  socket.on('job:status_changed', (data) => {
    // We can show a toast here or update a row if it's visible
    // For simplicity, we just trigger a data refresh if we are on the relevant page
    window.dispatchEvent(new CustomEvent('data:changed', { detail: 'jobs' }));
  });

  socket.on('worker:heartbeat', () => {
    window.dispatchEvent(new CustomEvent('data:changed', { detail: 'workers' }));
  });
  
  socket.on('queue:stats_updated', () => {
    window.dispatchEvent(new CustomEvent('data:changed', { detail: 'queues' }));
  });
});
