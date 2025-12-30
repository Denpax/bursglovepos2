import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// 🌙 Detectar preferencia del sistema y aplicar modo oscuro automáticamente
try {
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  document.body.innerHTML = `
    <div style="color: red; padding: 20px;">
      <h1>Error de Renderizado</h1>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  console.error('Render Error:', error);
}