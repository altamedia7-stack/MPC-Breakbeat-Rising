import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const hash = new URLSearchParams(window.location.hash.slice(1));
if (hash.has('access_token')) {
  if (window.opener) {
    window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS', token: hash.get('access_token') }, '*');
    window.close();
  }
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}