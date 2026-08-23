import ReactDOM from "react-dom/client";
import "./index.css";
import Login from "./app/pages/login";
import { Dashboard } from "./app/pages/dashboard";
import { HashRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarLayout } from "./app/layout/app-layout";
import { Settings } from "./app/pages/settings";
import { CandidatesList } from "./app/pages/candidates";
import { HiringPositions } from "./app/pages/hiring";
import { CandidateDetail } from "./app/pages/candidate-details";
import { JobApplicationsList } from "./app/pages/applications";
import { JobApplicationDetails } from "./app/pages/job-applicant-details";
import { AdminList } from "./app/pages/admins";
import { InterviewDetail } from "./app/pages/interview-details";
import { InterviewList } from "./app/pages/interviews";
import AdminInterviewRoomPage from "./app/pages/interview-room";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const queryClient = new QueryClient({});

root.render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <Routes>
        <Route path="/" Component={Login} />
        <Route path="/interview/:sessionId/room" Component={AdminInterviewRoomPage} />
        <Route element={<SidebarLayout />}>
          <Route path="/dashboard" Component={Dashboard} />
          <Route path="/candidates" Component={CandidatesList} />
          <Route path="/candidates/:candidateId" Component={CandidateDetail} />
          <Route path="/applications" Component={JobApplicationsList} />
          <Route path="/team" Component={AdminList} />
          <Route
            path="/applications/:candidateId/:applicationId"
            Component={JobApplicationDetails}
          />
          <Route path="/interviews" Component={InterviewList} />
          <Route path="/interviews/:candidateId/:sessionId" Component={InterviewDetail} />
          <Route path="/hiring" Component={HiringPositions} />
          <Route path="/settings" Component={Settings} />
        </Route>
      </Routes>
    </HashRouter>
  </QueryClientProvider>,
);