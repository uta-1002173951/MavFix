import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const reportStatuses = [
  "Open",
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];

function MainPage() {
  const navigate = useNavigate();

  const serverUrl = '/api/server/main';
  const serverUrlP = '/api/server/upload';
  const voteUrl = '/api/server/vote';

  const [reports, setReports] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [voteError, setVoteError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [account, setAccount] = useState(null);
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [pendingVotes, setPendingVotes] = useState({});
  const [votedReports, setVotedReports] = useState(() => {
    try {
      const savedVotes = JSON.parse(localStorage.getItem("mavfixVotes") || "{}");
      return savedVotes && typeof savedVotes === "object" ? savedVotes : {};
    } catch (error) {
      console.error("Failed to read saved votes", error);
      return {};
    }
  });
  const [voterId] = useState(() => {
    let id = localStorage.getItem("mavfixVoterId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("mavfixVoterId", id);
    }
    return id;
  });

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

  useEffect(() => {
    let active = true;

    fetch('/api/server/session', { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) return null;
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to verify your account.');
        }
        return data.user;
      })
      .then((user) => {
        if (active) setAccount(user);
      })
      .catch((error) => {
        console.error('Failed to load the signed-in account', error);
        if (active) setStatusError('Account permissions could not be verified.');
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
  const handleVote = async (reportId, voteType) => {
    const reportKey = String(reportId);
    if (votedReports[reportKey] || pendingVotes[reportKey]) return;

    setVoteError("");
    setPendingVotes((pending) => ({ ...pending, [reportKey]: true }));
    try {
      const response = await fetch(voteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, voterId, voteType }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          const updatedVotes = { ...votedReports, [reportKey]: result.voteType || "recorded" };
          setVotedReports(updatedVotes);
          localStorage.setItem("mavfixVotes", JSON.stringify(updatedVotes));
          setVoteError(result.error || "You have already voted on this report.");
          return;
        }
        throw new Error(result.error || "Your vote could not be recorded.");
      }

      setReports((currentReports) => currentReports.map((report) => (
        String(report.id) === reportKey
          ? { ...report, major: result.major, minor: result.minor }
          : report
      )));
      const updatedVotes = { ...votedReports, [reportKey]: voteType };
      setVotedReports(updatedVotes);
      localStorage.setItem("mavfixVotes", JSON.stringify(updatedVotes));
    } catch (error) {
      console.error("Failed to submit report vote", error);
      setVoteError(error.message || "Your vote could not be recorded.");
    } finally {
      setPendingVotes((pending) => {
        const updated = { ...pending };
        delete updated[reportKey];
        return updated;
      });
    }
  };
  const handleStatusChange = async (reportId, newStatus) => {
    const reportKey = String(reportId);
    setStatusError("");
    setPendingStatuses((pending) => ({ ...pending, [reportKey]: true }));
    try {
      const response = await fetch(
        `/api/server/reports/${encodeURIComponent(reportKey)}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The report status could not be updated.');
      }
      setReports((currentReports) => currentReports.map((report) => (
        String(report.id) === reportKey ? data.report : report
      )));
    } catch (error) {
      console.error('Failed to update report status', error);
      setStatusError(error.message || 'The report status could not be updated.');
    } finally {
      setPendingStatuses((pending) => {
        const updated = { ...pending };
        delete updated[reportKey];
        return updated;
      });
    }
  };
  const categories = [...new Set(
    reports
      .map((report) => report.category)
      .filter((category) => typeof category === "string" && category.trim())
  )].sort((a, b) => a.localeCompare(b));
  const visibleReports = reports
    .map((report, index) => ({ ...report, originalIndex: index }))
    .filter((report) => report.id !== 0 && report.id !== "0");
  const resolvedCount = visibleReports.filter((report) => report.status === "Resolved").length;
  const filteredReports = visibleReports.filter((report) => {
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
        <div className="header-inner">
          <h1>Home Page</h1>
          <h2>Report an issue and see reported issues below</h2>
          <button
            className="ReportButton"
            onClick={() => navigate("/report")}
          >
            + &nbsp; Report an issue
          </button>
        </div>
      </div>

      <main className="MainContent">
        <div className="dashboard-summary" aria-label="Campus report summary">
          <div className="summary-card">
            <span>Community reports</span>
            <strong>{visibleReports.length}</strong>
          </div>
          <div className="summary-card">
            <span>Being worked on</span>
            <strong>{visibleReports.filter((report) => report.status === "In Progress").length}</strong>
          </div>
          <div className="summary-card">
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </div>
        </div>

        <section className="reports-toolbar" aria-label="Find reports">
          <div className="SearchBar">
            <input
              type="search"
              aria-label="Search reports"
              placeholder="Search here..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
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
              {filtersOpen ? "Hide filters" : "Filters"}
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
        </section>

        <div className="section-heading">
          <div>
            <h2>Recent reports</h2>
          </div>
          <p>{filteredReports.length} {filteredReports.length === 1 ? "issue" : "issues"}</p>
        </div>
        {loadError && <p role="alert" className="empty-state">{loadError}</p>}
        {voteError && <p role="alert" className="empty-state">{voteError}</p>}
        {statusError && <p role="alert" className="empty-state">{statusError}</p>}
        {filteredReports.length === 0 ? (
          <p className="empty-state">No matching reports found. Try another search or clear your filters.</p>
        ) : (
          <ul>
            {filteredReports.map((report) => {
              return (
              <li key={report.originalIndex}>
                <h3>{report.title}</h3>

                {photoLookup[String(report.id)] && (
                  <div className="report-photo">
                    <img
                      src={photoLookup[String(report.id)]}
                      alt={`Photo for ${report.title}`}
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
                  <strong>Status:</strong>{" "}
                  <span className="report-status">{report.status || "Submitted"}</span>
                </p>

                <p>
                  <strong>Community support:</strong>{" "}
                  {report.major ?? report.majorVotes ?? 0} major · {report.minor ?? report.minorVotes ?? 0} minor
                </p>

                <div className="vote-actions">
                  <button
                    type="button"
                    disabled={Boolean(votedReports[String(report.id)] || pendingVotes[String(report.id)])}
                    onClick={() =>
                      handleVote(report.id, "major")
                    }
                  >
                    {pendingVotes[String(report.id)]
                      ? "Saving vote..."
                      : votedReports[String(report.id)]
                        ? "Voted"
                        : "Major issue"}
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(votedReports[String(report.id)] || pendingVotes[String(report.id)])}
                    onClick={() => handleVote(report.id, "minor")}
                  >
                    {pendingVotes[String(report.id)]
                      ? "Saving vote..."
                      : votedReports[String(report.id)]
                        ? "Voted"
                        : "Minor issue"}
                  </button>
                </div>

                {account?.role === 'staff' && (
                  <div className="status-control">
                    <label htmlFor={`status-${report.id}`}>Update status</label>
                    <select
                      id={`status-${report.id}`}
                      value={report.status || "Submitted"}
                      disabled={Boolean(pendingStatuses[String(report.id)])}
                      onChange={(e) => handleStatusChange(report.id, e.target.value)}
                    >
                      {reportStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </li>
            )})}
          </ul>
        )}
      </main>
    </>
  );
}

export default MainPage;
