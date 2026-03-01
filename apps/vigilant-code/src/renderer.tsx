import ReactDOM from 'react-dom/client';

import './index.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CodeEditor from './app/pages/code';
import LoginPage from './app/pages/auth/login';
import WaitingSetup from './app/pages/auth/waiting';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const queryClient = new QueryClient({});
root.render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <Routes>
      <Route path="/" Component={LoginPage} />
      <Route path="/wait" Component={WaitingSetup}/>
      <Route path="/code/:id" Component={CodeEditor}/>
      </Routes>
    </HashRouter>
  </QueryClientProvider>
);
