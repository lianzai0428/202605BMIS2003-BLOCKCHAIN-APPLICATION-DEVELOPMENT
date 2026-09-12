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

import ApprovalTasks
  from "./pages/ApprovalTasks";

import AgreementDetails
  from "./pages/AgreementDetails";

import TransactionHistory
  from "./pages/TransactionHistory";

import RoleRoute
  from "./components/RoleRoute";

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
              <RoleRoute
                allowedRoles={[1]}
              >
                <CreateAgreement />
              </RoleRoute>
            }
          />

          <Route
            path="/fund-agreement"
            element={
              <RoleRoute
                allowedRoles={[1]}
              >
                <FundAgreement />
              </RoleRoute>
            }
          />

          <Route
            path="/milestones"
            element={
              <RoleRoute
                allowedRoles={[1]}
              >
                <Milestones />
              </RoleRoute>
            }
          />

          <Route
            path="/proof-upload"
            element={
              <RoleRoute
                allowedRoles={[2]}
              >
                <ProofUpload />
              </RoleRoute>
            }
          />

          <Route
            path="/approval-tasks"
            element={
              <RoleRoute
                allowedRoles={[3, 4]}
              >
                <ApprovalTasks />
              </RoleRoute>
            }
          />

          <Route
            path="/agreements/:agreementId"
            element={
              <AgreementDetails />
            }
          />

          <Route
            path="/transactions"
            element={
              <TransactionHistory />
            }
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
