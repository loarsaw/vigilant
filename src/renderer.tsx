import ReactDOM from 'react-dom/client';

import './index.css';
import { HashRouter, Route, Routes } from 'react-router-dom';

import Team from './component/Team';
import App from './layout/App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <HashRouter>
    <Routes>
      <Route path="/" Component={App} />
      <Route path="/team" Component={Team} />
    </Routes>
  </HashRouter>
);
