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
            <div className="LoginForm" style={{ display: 'none', marginTop: '250px' }}>
                <form action="/submit-data" method="POST" onSubmit={handleSubmit}>
                    <label htmlFor="username" style={{ marginRight: '10px' }}>Username:</label>
                    <input type="text" id="username" name="username" required style={{ marginRight: '10px' }} />
                    <label htmlFor="password" style={{ marginRight: '10px' }}>Password:</label>
                    <input type="password" id="password" name="password" required style={{ marginRight: '10px' }} />
                    <button type="submit">Login</button>
                </form>
            </div>
            <div className="SignUpForm" style={{ display: 'none', marginTop: '250px' }}>
                <form action="/submit-data" method="POST" onSubmit={handleSubmit}>
                    <label htmlFor="username" style={{ marginRight: '10px' }}>Username:</label>
                    <input type="text" id="username" name="username" required style={{ marginRight: '10px' }} />
                    <label htmlFor="email" style={{ marginRight: '10px' }}>Email:</label>
                    <input type="email" id="email" name="email" required style={{ marginRight: '10px' }} />
                    <label htmlFor="password" style={{ marginRight: '10px' }}>Password:</label>
                    <input type="password" id="password" name="password" required style={{ marginRight: '10px' }} />
                    <button type="submit">Sign Up</button>
                </form>
            </div>
            <div className="ToggleButtons" style={{ marginTop: '200px' }}>
                <button style={{ marginRight: '10px' }} onClick={() => {
                    document.querySelector('.LoginForm').style.display = 'block';
                    document.querySelector('.SignUpForm').style.display = 'none';
                }}>Have an account</button>
                <button onClick={() => {
                    document.querySelector('.LoginForm').style.display = 'none';
                    document.querySelector('.SignUpForm').style.display = 'block';
                }}>Create an account</button>
            </div>
        </>
    )
}

export default LoginPage;
