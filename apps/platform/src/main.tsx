import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@experience/room-runtime/room.css';
import './shared/app.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
