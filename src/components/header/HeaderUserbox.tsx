import { useState } from "react";
import UserMfaSettingDialog from "../dialogs/UserMfaSettingDialog";
import { useUser } from "../../contexts/UserContext";

const HeaderUserbox = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const { userInfo } = useUser();

  const displayName =
    userInfo?.email?.trim() || userInfo?.sign_in_id?.trim() || "ユーザー";

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const openMfaDialog = () => {
    setMenuOpen(false);
    setMfaDialogOpen(true);
  };

  return (
    <header className="flex justify-between items-center bg-gray-800 text-white px-5 py-3">
      <span className="text-lg font-bold">サンプルアプリ</span>
      <button
        onClick={toggleMenu}
        className="bg-transparent border-none text-white text-sm cursor-pointer"
      >
        {`${displayName} ▼`}
      </button>
      {menuOpen && (
        <div className="absolute top-12 right-5 bg-white text-black shadow-md rounded overflow-hidden min-w-[120px] z-50">
          <button
            onClick={openMfaDialog}
            className="w-full py-2 px-3 text-left bg-transparent border-none cursor-pointer text-sm hover:bg-gray-100"
          >
            多要素認証の設定
          </button>
        </div>
      )}
      <UserMfaSettingDialog
        open={mfaDialogOpen}
        handleClose={() => setMfaDialogOpen(false)}
      />
    </header>
  );
};

export default HeaderUserbox;
