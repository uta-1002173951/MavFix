function MainPage() {
  return (
    <>
        <div class="MainHeader">
            <h1>Welcome to MavFix</h1>
            <h2>Report all issues on campus here</h2>
            <button className="ReportButton" style={{ width: '200px', height: '40px', marginTop: '20px' }}>
                Report Issue
            </button>
        </div>
        <div class="MainContent" style={{ marginTop: '20px' }}>
            <input type="text" placeholder="Search reports..." style={{ width: '80%', height: '30px', marginBottom: '20px' }} />
            <button className="SearchButton" style={{ width: '100px', height: '30px', marginLeft: '10px' }}>
                Search
            </button>
            <h2>Recent Reports</h2>
            <ul>
                <li>Report 1</li>
                <li>Report 2</li>
                <li>Report 3</li>
            </ul>
        </div>
    </>
  );
}

export default MainPage