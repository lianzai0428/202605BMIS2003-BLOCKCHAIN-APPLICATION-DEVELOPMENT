import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "./components/AppLayout";

import Landing from "./pages/Landing";
import ConnectWallet from "./pages/ConnectWallet";
import UserAccess from "./pages/UserAccess";

import Dashboard from "./pages/Dashboard";
import Agreements from "./pages/Agreements";
import CreateAgreement from "./pages/CreateAgreement";
import FundAgreement from "./pages/FundAgreement";
import Milestones from "./pages/Milestones";
import ProofUpload from "./pages/ProofUpload";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ENTRY FLOW */}

        <Route
          path="/"
          element={
            <Landing />
          }
        />

        <Route
          path="/connect"
          element={
            <ConnectWallet />
          }
        />

        <Route
          path="/access"
          element={
            <UserAccess />
          }
        />


        {/* MAIN APP */}

        <Route
          element={
            <AppLayout />
          }
        >
          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />

          <Route
            path="/agreements"
            element={
              <Agreements />
            }
          />

          <Route
            path="/create-agreement"
            element={
              <CreateAgreement />
            }
          />

          <Route
            path="/fund-agreement"
            element={
              <FundAgreement />
            }
          />

          <Route
            path="/milestones"
            element={
              <Milestones />
            }
          />

          <Route
            path="/proof-upload"
            element={
              <ProofUpload />
            }
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
