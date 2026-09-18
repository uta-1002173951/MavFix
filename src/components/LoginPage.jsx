import {useNavigate} from 'react-router-dom'

function LoginPage() {
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate('/main');
    };

    return (
        <>
            <div className="LoginHeader">
                <h1>MavFix</h1>
                <h3>Login to continue</h3>
            </div>
            <div className="LoginForm" style={{ marginTop: '250px' }}>
                <form action="/submit-data" method="POST" onSubmit={handleSubmit}>
                    <label htmlFor="username" style={{ marginRight: '10px' }}>Username:</label>
                    <input type="text" id="username" name="username" required style={{ marginRight: '10px' }} />
                    <label htmlFor="password" style={{ marginRight: '10px' }}>Password:</label>
                    <input type="password" id="password" name="password" required style={{ marginRight: '10px' }} />
                    <button type="submit">Login</button>
                </form>
            </div>
        </>
    )
}

export default LoginPage