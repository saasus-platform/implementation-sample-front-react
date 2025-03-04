import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Auth from "./components/Auth";
import Callback from "./pages/Callback";
import UserPage from "./pages/UserPage";
import TenantList from "./pages/TenantList";
import UserRegister from "./pages/UserRegister";
import DeleteUserLog from "./pages/DeleteUserLog";
import SelfSignUp from "./pages/SelfSignUp";
import HeaderUserbox from "./components/header/HeaderUserbox";

const AppContent = () => {
  const location = useLocation();

  // ヘッダーを非表示にするページのリスト
  const noHeaderPages = ["/callback"];

  // 現在のページが `noHeaderPages` に含まれていない場合のみヘッダーを表示
  const showHeader = !noHeaderPages.includes(location.pathname);

  return (
    <>
      {showHeader && <HeaderUserbox />}
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={<Auth />}>
          <Route path="/tenants" element={<TenantList />} />
          <Route path="/user/toppage" element={<UserPage />} />
          <Route path="/admin/toppage" element={<UserPage />} />
          <Route path="/sadmin/toppage" element={<UserPage />} />
          <Route path="/user_register" element={<UserRegister />} />
          <Route path="/delete_user_log" element={<DeleteUserLog />} />
          <Route path="/self_sign_up" element={<SelfSignUp />} />
        </Route>
      </Routes>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
