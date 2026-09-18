import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/standard.css';
import '@fontsource-variable/azeret-mono/wght.css';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/global.css';
import './styles/sections.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
