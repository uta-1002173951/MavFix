import { useState } from "react";
import { useNavigate } from "react-router-dom";

function ReportIssue() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const newReport = {
      title,
      category,
      location,
      description,
      status: "Submitted",
      majorVotes: 0,
      minorVotes: 0,
    };

    const existingReports =
      JSON.parse(localStorage.getItem("mavfixReports")) || [];

    const updatedReports = [...existingReports, newReport];

    localStorage.setItem(
      "mavfixReports",
      JSON.stringify(updatedReports)
    );

    navigate("/main");
  };

  return (
    <div className="report-page">
      <h1>Report a Campus Issue</h1>

      <p>Provide information about the issue below.</p>

      <form onSubmit={handleSubmit} className="report-form">
        <label>Issue Title</label>

        <input
          type="text"
          placeholder="Example: Broken projector"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <label>Category</label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select a category</option>
          <option value="Technology">Technology</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Safety">Safety</option>
          <option value="Other">Other</option>
        </select>

        <label>Campus Location</label>

        <input
          type="text"
          placeholder="Example: ERB 103"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />

        <label>Description</label>

        <textarea
          placeholder="Describe the issue..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <button type="submit">
          Submit Report
        </button>

        <button
          type="button"
          onClick={() => navigate("/main")}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

export default ReportIssue;