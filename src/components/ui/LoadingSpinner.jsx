import './LoadingSpinner.css';

function LoadingSpinner({ size = 'medium', text = '' }) {
  return (
    <div className="loading-spinner-wrapper">
      <div className="loading-spinner-content">
        <div className={`loading-spinner spinner-${size}`}></div>
        {text && <p className="loading-text">{text}</p>}
      </div>
    </div>
  );
}

export default LoadingSpinner;