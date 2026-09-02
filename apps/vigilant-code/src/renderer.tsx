import ReactDOM from "react-dom/client";
import "./index.css";
import { HashRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sandbox from "./app/pages/code/sandbox";
import CodeEditor from "./app/pages/code/code-editor";
import WaitingSetup from "./app/pages/auth/waiting";
import AppLayout, {
  AuthLayout,
  EnvironmentLayout,
  ProtectedLayout,
} from "./components/layout/app-layout";
import Dashboard from "./app/pages/dashboard/dashboard";
import { Profile } from "./app/pages/auth/profile";
import { useDeepLink } from "./hooks/use-link";
import DeepLinkHandler from "./app/pages/auth/link-handler";
import InterviewRoom from "./app/pages/interview/page";
import LoginPage from "./app/pages/auth/login";
import InterviewRoomPage from "./app/pages/interview/page";

const AppRoutes = () => {
  useDeepLink();

  return (
    <Routes>
      <Route Component={AppLayout}>
        <Route Component={AuthLayout}>
          <Route path="/" Component={LoginPage} />
        </Route>
        <Route path="/linkstart" Component={DeepLinkHandler} />
        <Route Component={ProtectedLayout}>
          <Route path="/dashboard" Component={Dashboard} />
          <Route path="/profile" Component={Profile} />
          <Route Component={EnvironmentLayout}>
            {/* <Route path="/interview/:id" Component={WaitingSetup} /> */}
            {/* <Route path="/interview/:sessionId" Component={InterviewRoom} /> */}
            <Route path="/interview/:sessionId/room" element={<InterviewRoomPage />} />
            <Route path="/code/:id" Component={Sandbox} />
            <Route path="/editor/:language" Component={CodeEditor} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const queryClient = new QueryClient({});

root.render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </QueryClientProvider>,
);
