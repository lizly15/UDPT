// ĐÃ WIRE SẴN TOÀN BỘ ROUTE — 2 bạn FE KHÔNG cần sửa file này.
// Mỗi route trỏ tới 1 file trang riêng; mỗi người chỉ sửa file trang của mình.
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// FE-A
import Customers from "./pages/Customers";
import ServiceCatalog from "./pages/ServiceCatalog";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import Pricing from "./pages/Pricing";
// FE-B
import Volumes from "./pages/Volumes";
import Payments from "./pages/Payments";
import PaymentDetail from "./pages/PaymentDetail";
import ApprovalInbox from "./pages/ApprovalInbox";
import Notifications from "./pages/Notifications";
import Audit from "./pages/Audit";
import Admin from "./pages/Admin";

function Protected({ children }: { children: JSX.Element }) {
  return localStorage.getItem("access_token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        {/* FE-A */}
        <Route path="customers" element={<Customers />} />
        <Route path="services" element={<ServiceCatalog />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="contracts/:code" element={<ContractDetail />} />
        <Route path="pricing" element={<Pricing />} />
        {/* FE-B */}
        <Route path="volumes" element={<Volumes />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:id" element={<PaymentDetail />} />
        <Route path="inbox" element={<ApprovalInbox />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="audit" element={<Audit />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
