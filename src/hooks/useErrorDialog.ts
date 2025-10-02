import { useState } from "react";

export const useErrorDialog = () => {
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const hideError = () => {
    setShowErrorModal(false);
    setErrorMessage("");
  };

  return {
    showErrorModal,
    errorMessage,
    showError,
    hideError,
  };
};