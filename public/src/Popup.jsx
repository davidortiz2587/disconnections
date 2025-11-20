import React from "react";
import "./Popup.css";

function Popup({ message, details, onClose }) {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <p className="popup-message">{message}</p>
        <p className="popup-details">
          {details.split('\n').map((line, idx) => (
            <span key={idx}>
              {line}
              <br />
            </span>
          ))}
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default Popup;