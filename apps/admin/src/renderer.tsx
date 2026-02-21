import ReactDOM from 'react-dom/client';
import './index.css';
import Login from './app/pages/login';
import { Dashboard } from './app/pages/dashboard';
import { CandidateReviewPage } from '@/app/pages/candidate-list';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CandidatePage } from '@/app/pages/candidate-page';
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
        <Route path="/candidates" Component={CandidateReviewPage}/>
       <Route path="/candidates/:candidateId" Component={CandidatePage} />
      </Routes>
    </HashRouter>
  </QueryClientProvider>
);
