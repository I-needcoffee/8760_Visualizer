import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Upload8760App } from './Upload8760App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Upload8760App />
  </StrictMode>,
);
