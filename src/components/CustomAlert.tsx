import React from "react";

interface CustomAlertProps {
  isOpen: boolean;
  subHeader: string;
  message: string;
  buttons: Array<{
    text: string;
    cssClass?: string;
    role?: string;
    handler?: () => void | Promise<void>;
  }>;
  onClose: () => void;
  onMessageClick?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  subHeader,
  message,
  buttons,
  onClose,
  onMessageClick,
}) => {
  if (!isOpen) return null;

  const handleButtonClick = async (button: CustomAlertProps["buttons"][0]) => {
    if (button.handler) {
      await button.handler();
    } else {
      onClose();
    }
  };

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div
        className="custom-alert-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="custom-alert-subheader">{subHeader}</p>

        {message && (
          <button
            type="button"
            className="custom-alert-message"
            onClick={() => onMessageClick?.()}
          >
            {message}
          </button>
        )}

        <div className="custom-alert-buttons">
          {buttons.map((button, index) => (
            <button
              key={`${button.text}-${index}`}
              type="button"
              className={`custom-alert-btn ${button.cssClass || ""}`}
              onClick={() => handleButtonClick(button)}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
