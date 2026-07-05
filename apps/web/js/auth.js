document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const registerForm = document.getElementById('register-form');
  const registerError = document.getElementById('register-error');
  const logoutBtn = document.getElementById('logout-btn');
  
  const loginFormContainer = document.getElementById('login-form-container');
  const registerFormContainer = document.getElementById('register-form-container');
  const showRegisterLink = document.getElementById('show-register-link');
  const showLoginLink = document.getElementById('show-login-link');

  // Check auth on load
  const token = localStorage.getItem('access_token');
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }

  // Toggle forms
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.classList.add('hidden');
    registerFormContainer.classList.remove('hidden');
    registerError.innerText = '';
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    loginError.innerText = '';
  });

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    loginError.innerText = '';
    
    try {
      const res = await api.post('/auth/login', { email, password });
      handleAuthSuccess(res);
    } catch (err) {
      loginError.innerText = err.message;
    }
  });

  // Register handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    registerError.innerText = '';
    
    try {
      const res = await api.post('/auth/register', { name, email, password });
      handleAuthSuccess(res);
    } catch (err) {
      // Check if it's an array of validation errors
      if (Array.isArray(err.message)) {
        registerError.innerText = err.message.join(', ');
      } else {
        registerError.innerText = err.message;
      }
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    showLogin();
  });
});

function handleAuthSuccess(res) {
  localStorage.setItem('access_token', res.tokens.accessToken);
  localStorage.setItem('refresh_token', res.tokens.refreshToken);
  localStorage.setItem('user', JSON.stringify(res.user));
  showToast(`Welcome back, ${res.user.name}!`, 'success');
  showDashboard();
}

function showLogin() {
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
}

function showDashboard() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  // Trigger initial dashboard load event
  window.dispatchEvent(new Event('dashboard:ready'));
}
