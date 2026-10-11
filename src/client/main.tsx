import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { cleanUpStorage, queryClient } from './api/data';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

cleanUpStorage();
