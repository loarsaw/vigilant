import ReactDOM from "react-dom/client";
import "./index.css";
import { HashRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sandbox from "./app/pages/code/sandbox";
import CodeEditor from "./app/pages/code/code-editor";
import LoginPage from "./app/pages/auth/login";
import WaitingSetup from "./app/pages/auth/waiting";
import AppLayout, { AuthLayout, ProtectedLayout } from "./components/layout/app-layout";
import OnboardingForm from "./app/pages/auth/onboarding";
import Dashboard from "./app/pages/dashboard/dashboard";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const queryClient = new QueryClient({});
root.render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <Routes>
        <Route Component={AppLayout}>
          <Route Component={AuthLayout}>
            <Route path="/" Component={LoginPage} />
          </Route>
          <Route Component={ProtectedLayout}>
            <Route path="/onboarding" Component={OnboardingForm} />
            <Route path="/dashboard" Component={Dashboard} />
            <Route path="/wait" Component={WaitingSetup} />
            <Route path="/code/:id" Component={Sandbox} />
            <Route path="/editor/:language" Component={CodeEditor} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  </QueryClientProvider>,
);
