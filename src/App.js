import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import MineSum10Page from "./pages/MineSum10Page";
import "./App.css";

const Home = () => (
  <div className="home">
    <h1>Quiz Game Prototypes</h1>
    <p>Navigate to the MineSum10 prototype.</p>
    <Link to="/prototype/minesum10" className="link">Go to MineSum10</Link>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prototype/minesum10" element={<MineSum10Page />} />
      </Routes>
    </Router>
  );
}

export default App;
