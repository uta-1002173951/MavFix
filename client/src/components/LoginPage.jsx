import {useNavigate} from 'react-router-dom'

function LoginPage() {
    const navigate = useNavigate();
    
    const serverUrl = 'http://localhost:4000/api/server';

    async function sendSignUp(username, email, password) {
        const response = await fetch(`${serverUrl}/signup`, {
            method: 'POST',
            headers: {  'Content-Type': 'application/json'  },
            body: JSON.stringify({ username: username, email: email, password: password })
        });
        const data = await response.json();
        console.log(data);
        return data;
    }

    async function getLogin(username, password) {
        const response = await fetch(`${serverUrl}/login`, {
            method: 'POST',
            headers: {  'Content-Type': 'application/json'  },
            body: JSON.stringify({ username: username, password: password })
        });
        const data = await response.json();
        console.log(data);
        return data;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = document.querySelector('#username').value;
        const password = document.querySelector('#password').value;
        const data = await getLogin(username, password);
        if(data === "success") {
            navigate('/main');
        } else {
            alert("Invalid username or password");
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        const username = document.querySelector('#username2').value;
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password2').value;
        if(email.endsWith("@mavs.uta.edu") === false) {
            alert("Invalid email address");
            return;
        }
        const data = await sendSignUp(username, email, password);
        if(data === "success") {
            navigate('/main');
        } else {
            alert("Sign up failed");
        }
    };

    return (
        <>
            <div className="LoginHeader">
                <h1>MavFix</h1>
                <h3>Login to continue</h3>
            </div>
            <div className="LoginForm" style={{ display: 'none', marginTop: '250px' }}>
                <form action="/submit-data" method="POST" onSubmit={handleLogin}>
                    <label htmlFor="username" style={{ marginRight: '10px' }}>Username:</label>
                    <input type="text" id="username" name="username" required style={{ marginRight: '10px' }} />
                    <label htmlFor="password" style={{ marginRight: '10px' }}>Password:</label>
                    <input type="password" id="password" name="password" required style={{ marginRight: '10px' }} />
                    <button type="submit">Login</button>
                </form>
            </div>
            <div className="SignUpForm" style={{ display: 'none', marginTop: '250px' }}>
                <form action="/submit-data" method="POST" onSubmit={handleSignUp}>
                    <label htmlFor="username2" style={{ marginRight: '10px' }}>Username:</label>
                    <input type="text" id="username2" name="username2" required style={{ marginRight: '10px' }} />
                    <label htmlFor="email" style={{ marginRight: '10px' }}>Email:</label>
                    <input type="email" id="email" name="email" required style={{ marginRight: '10px' }} />
                    <label htmlFor="password2" style={{ marginRight: '10px' }}>Password:</label>
                    <input type="password" id="password2" name="password2" required style={{ marginRight: '10px' }} />
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
