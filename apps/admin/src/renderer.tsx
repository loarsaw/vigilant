import ReactDOM from 'react-dom/client';
import './index.css';
import Login from './app/pages/login';
import { Dashboard } from './app/pages/dashboard';

import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const queryClient = new QueryClient({});

root.render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <Routes>
        <Route path="/" Component={Login} />
        <Route path="/dashboard" Component={Dashboard} />
      </Routes>
    </HashRouter>
  </QueryClientProvider>
);
