import { BrowserRouter, Route, Routes } from "react-router-dom";
import Auth from "./components/Auth";
import Callback from "./pages/Callback";
import UserPage from "./pages/UserPage";
import TenantList from "./pages/TenantList";
import UserRegister from "./pages/UserRegister";
import DeleteUserLog from "./pages/DeleteUserLog";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={<Auth />}>
          <Route path="/tenants" element={<TenantList />} />
          <Route path="/user/toppage" element={<UserPage />} />
          <Route path="/admin/toppage" element={<UserPage />} />
          <Route path="/sadmin/toppage" element={<UserPage />} />
          <Route path="/user_register" element={<UserRegister />} />
          <Route path="/delete_user_log" element={<DeleteUserLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
