import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const reportStatuses = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];

function MainPage() {
  const navigate = useNavigate();

  const serverUrl = 'http://localhost:4000/api/server/main';
  const serverUrlP = 'http://localhost:4000/api/server/upload';

  const [reports, setReports] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReportsAndPhotos() {
      const [reportsResponse, photosResponse] = await Promise.all([
        fetch(serverUrl),
        fetch(serverUrlP),
      ]);
      if (!reportsResponse.ok || !photosResponse.ok) {
        throw new Error("Failed to load reports or photos");
      }
      const [reportsData, photosData] = await Promise.all([
        reportsResponse.json(),
        photosResponse.json(),
      ]);
      if (active) {
        setReports(reportsData);
        setPhotos(photosData);
      }
    }
    loadReportsAndPhotos().catch((error) => {
      console.error("Failed to load reports and photos", error);
      if (active) {
        setLoadError("Reports and photos could not be loaded.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const photoLookup = Object.fromEntries(photos.map(p => [p.id, p.url]));

  const [searchText, setSearchText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const categories = [...new Set(
    reports
      .map((report) => report.category)
      .filter((category) => typeof category === "string" && category.trim())
  )].sort((a, b) => a.localeCompare(b));
  const filteredReports = reports
    .map((report, index) => ({
      ...report,
      originalIndex: index,
    }))
    .filter((report) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = [
        report.title,
        report.category,
        report.location,
        report.description,
      ].some((value) => (value || "").toLowerCase().includes(search));

      return (
        (!categoryFilter || report.category === categoryFilter) &&
        (!statusFilter || (report.status || "Submitted") === statusFilter) &&
        matchesSearch
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
        <div className="SearchBar">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <button
            className="SearchButton"
            onClick={handleSearch}
            type="button"
          >
            Search
          </button>

          <button
            className="SearchButton FilterToggle"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="report-filters"
          >
            Filters
          </button>
        </div>

        {filtersOpen && (
          <div className="ReportFilters" id="report-filters">
            <label>
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {reportStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <h2>Recent Reports</h2>
        {loadError && <p role="alert">{loadError}</p>}
        {filteredReports.length === 0 ? (
          <p>No matching reports found.</p>
        ) : (
          <ul>
            {filteredReports.map((report) => {
              if(report.id == 0){
                return;
              }
              return (
              <li key={report.originalIndex}>
                <h3>{report.title}</h3>

                {photoLookup[String(report.id)] && (
                  <div style={{ maxWidth: "400px", marginBottom: "16px" }}>
                    <img
                      src={photoLookup[String(report.id)]}
                      alt={`Photo for ${report.title}`}
                      style={{
                        display: "block",
                        width: "100%",
                        maxHeight: "300px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

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
                    {reportStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>
    </>
  );
}

export default MainPage;
