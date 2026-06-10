import leightonLogo from "../assets/leighton-logo.png";

function LeightonLogo({ compact = false }) {
  const widthClass = compact ? "w-64" : "w-full max-w-lg";

  return (
    <img
      src={leightonLogo}
      alt="Leighton"
      className={`${widthClass} max-w-full object-contain`}
    />
  );
}

export default LeightonLogo;
