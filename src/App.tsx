import { BrowserRouter, Route, Routes } from "react-router-dom";
import Auth from "./components/Auth";
import Callback from "./pages/Callback";
import UserPage from "./pages/UserPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={<Auth />}>
          <Route path="/user/toppage" element={<UserPage />} />
          <Route path="/admin/toppage" element={<UserPage />} />
          <Route path="/sadmin/toppage" element={<UserPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
