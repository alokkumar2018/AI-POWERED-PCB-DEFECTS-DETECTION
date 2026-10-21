import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <span>⚡ CircuitSentinel — AI PCB Inspection</span>
      <a
        href="https://github.com/alokkumar2018/AI-POWERED-PCB-DEFECTS-DETECTION"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 14, marginLeft: 16, textDecoration: "underline" }}
      >GitHub source</a>
    </nav>
  );
}

export default Navbar;
