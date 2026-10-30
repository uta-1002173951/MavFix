import { useNavigate } from "react-router-dom";

function ReportIssue() {
  const navigate = useNavigate();

  const serverUrl = 'http://localhost:4000/api/server/report';
  const serverUrlP = 'http://localhost:4000/api/server/upload'


  async function sendReport(title, category, location, description) {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {  'Content-Type': 'application/json'  },
      body: JSON.stringify({ title: title, category: category, location: location, description: description })
    });
    const data = await response.json();
    console.log(data);
    return data;
  }

  async function sendPhoto(photo, id) {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('photo', photo.files[0]);
    const response = await fetch(serverUrlP, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    console.log(data);
    return data;
  }

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const title = document.querySelector('#title').value;
    const category = document.querySelector('#category').value;
    const location = document.querySelector('#location').value;
    const description = document.querySelector('#description').value;
    const photo = document.getElementById('photo');
    const reportId = await sendReport(title, category, location, description);
    if(reportId === "fail") {
      alert("Report submission failed");
      return;
    }
    if(photo.files.length > 0) {
      const photoResult = await sendPhoto(photo, reportId);
      if(photoResult.message !== "success") {
        alert("Report submitted, but its photo could not be uploaded.");
      }
    }
    navigate("/main");
  };

  return (
    <div className="report-page">
      <h1>Report a Campus Issue</h1>

      <p>Provide information about the issue below.</p>

      <form onSubmit={handleReportSubmit} className="report-form">
        <label>Issue Title</label>

        <input
          type="text"
          placeholder="Example: Broken projector"
          id = "title"
          name = "title"
          required
        />

        <label>Category</label>

        <select
          id = "category"
          name = "category"
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
          id = "location"
          name = "location"
          required
        />

        <label>Description</label>

        <textarea
          placeholder="Describe the issue..."
          id = "description"
          name = "description"
          required
        />

        <label>Photo Upload (optional)</label>

        <input
          type="file"
          id="photo"
          name="photo"
          accept="image/jpeg,image/png,image/gif"
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
