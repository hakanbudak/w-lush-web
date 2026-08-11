import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Self-hosted fontlar (dış ağ isteği yok): UI Hanken Grotesk,
// başlıklar Lora, sayı/saat hizalaması için Geist Mono.
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';

import './styles/design-system.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
