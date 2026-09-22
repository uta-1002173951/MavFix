import { useState } from "react";
import { useNavigate } from "react-router-dom";

function MainPage() {
  const navigate = useNavigate();

  const [reports, setReports] = useState(() => {
    return JSON.parse(localStorage.getItem("mavfixReports")) || [];
  });

  const [searchText, setSearchText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    setSearchTerm(searchText);
  };

  const saveReports = (updatedReports) => {
    setReports(updatedReports);

    localStorage.setItem(
      "mavfixReports",
      JSON.stringify(updatedReports)
    );
  };

  const handleVote = (index, voteType) => {
    const updatedReports = [...reports];

    if (voteType === "major") {
      updatedReports[index].majorVotes =
        (updatedReports[index].majorVotes || 0) + 1;
    }

    if (voteType === "minor") {
      updatedReports[index].minorVotes =
        (updatedReports[index].minorVotes || 0) + 1;
    }

    saveReports(updatedReports);
  };

  const handleStatusChange = (index, newStatus) => {
    const updatedReports = [...reports];

    updatedReports[index].status = newStatus;

    saveReports(updatedReports);
  };

  const filteredReports = reports
    .map((report, index) => ({
      ...report,
      originalIndex: index,
    }))
    .filter((report) => {
      const search = searchTerm.toLowerCase();

      return (
        report.title.toLowerCase().includes(search) ||
        report.category.toLowerCase().includes(search) ||
        report.location.toLowerCase().includes(search) ||
        report.description.toLowerCase().includes(search)
      );
    });

  return (
    <>
      <div className="MainHeader">
        <h1>Welcome to MavFix</h1>
        <h2>Report all issues on campus here</h2>

        <button
          className="ReportButton"
          onClick={() => navigate("/report")}
          style={{
            width: "200px",
            height: "40px",
            marginTop: "20px",
          }}
        >
          Report Issue
        </button>
      </div>

      <div
        className="MainContent"
        style={{ marginTop: "20px" }}
      >
        <input
          type="text"
          placeholder="Search reports..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: "80%",
            height: "30px",
            marginBottom: "20px",
          }}
        />

        <button
          className="SearchButton"
          onClick={handleSearch}
          style={{
            width: "100px",
            height: "30px",
            marginLeft: "10px",
          }}
        >
          Search
        </button>

        <h2>Recent Reports</h2>

        {filteredReports.length === 0 ? (
          <p>No matching reports found.</p>
        ) : (
          <ul>
            {filteredReports.map((report) => (
              <li key={report.originalIndex}>
                <h3>{report.title}</h3>

                <p>
                  <strong>Category:</strong> {report.category}
                </p>

                <p>
                  <strong>Location:</strong> {report.location}
                </p>

                <p>
                  <strong>Description:</strong> {report.description}
                </p>

                <p>
                  <strong>Status:</strong> {report.status}
                </p>

                <p>
                  <strong>Major:</strong>{" "}
                  {report.majorVotes || 0}
                  {" | "}
                  <strong>Minor:</strong>{" "}
                  {report.minorVotes || 0}
                </p>

                <button
                  onClick={() =>
                    handleVote(
                      report.originalIndex,
                      "major"
                    )
                  }
                >
                  Major
                </button>

                <button
                  onClick={() =>
                    handleVote(
                      report.originalIndex,
                      "minor"
                    )
                  }
                >
                  Minor
                </button>

                <div>
                  <label>
                    <strong>Update Status: </strong>
                  </label>

                  <select
                    value={report.status || "Submitted"}
                    onChange={(e) =>
                      handleStatusChange(
                        report.originalIndex,
                        e.target.value
                      )
                    }
                  >
                    <option value="Submitted">
                      Submitted
                    </option>

                    <option value="Under Review">
                      Under Review
                    </option>

                    <option value="In Progress">
                      In Progress
                    </option>

                    <option value="Resolved">
                      Resolved
                    </option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default MainPage;