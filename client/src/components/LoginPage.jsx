import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [authError, setAuthError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    const API_URL = import.meta.env.VITE_API_URL;
    const serverUrl = `${API_URL}/server`;

    async function sendSignUp(username, email, password) {
        const response = await fetch(`${serverUrl}/signup`, {
            method: 'POST',
            headers: {  'Content-Type': 'application/json'  },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Sign up failed.');
        }
        return data;
    }

    async function getLogin(identifier, password) {
        const response = await fetch(`${serverUrl}/login`, {
            method: 'POST',
            headers: {  'Content-Type': 'application/json'  },
            credentials: 'include',
            body: JSON.stringify({ identifier, password })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Sign in failed.');
        }
        return data;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setAuthError('');
        setSubmitting(true);
        try {
            await getLogin(formData.get('identifier'), formData.get('password'));
            navigate('/main');
        } catch (error) {
            setAuthError(error.message || 'Sign in failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = formData.get('username');
        const email = String(formData.get('email')).trim().toLowerCase();
        const password = formData.get('password');
        setAuthError('');
        if (!/^[^@\s]+@(?:mavs\.uta\.edu|uta\.edu)$/.test(email)) {
            setAuthError('Use a @mavs.uta.edu student email or @uta.edu faculty email.');
            return;
        }
        setSubmitting(true);
        try {
            await sendSignUp(username, email, password);
            navigate('/main');
        } catch (error) {
            setAuthError(error.message || 'Sign up failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-story">
                <div className="auth-brand">MavFix</div>
                <div className="auth-story-copy">
                    <p className="eyebrow">Make UTA's campus a better place</p>
                    <p>Share issue on campus, support other community issues, and follow every issue from report to resolution.</p>
                </div>
                <p className="auth-footer">Built for Mavericks, one campus improvement at a time.</p>
            </section>

            <section className="auth-main">
                <div className="auth-card">
                    <h2>{mode === 'login' ? 'Welcome back' : 'Join MavFix'}</h2>
                    <p className="auth-subtitle">
                        {mode === 'login'
                            ? 'Sign in with your username or UTA email.'
                            : 'Students and faculty can join with their UTA email.'}
                    </p>

                    <div className="auth-switch" aria-label="Account options">
                        <button
                            type="button"
                            aria-pressed={mode === 'login'}
                            onClick={() => setMode('login')}
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            aria-pressed={mode === 'signup'}
                            onClick={() => setMode('signup')}
                        >
                            Create account
                        </button>
                    </div>

                    {mode === 'login' ? (
                        <form className="auth-form" onSubmit={handleLogin}>
                            <label htmlFor="identifier">Username or UTA email</label>
                            <input type="text" id="identifier" name="identifier" autoComplete="username" required />
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" autoComplete="current-password" required />
                            <button className="auth-submit" type="submit" disabled={submitting}>
                                {submitting ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>
                    ) : (
                        <form className="auth-form" onSubmit={handleSignUp}>
                            <label htmlFor="username">Username</label>
                            <input type="text" id="username" name="username" autoComplete="username" required />
                            <label htmlFor="email">UTA email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                placeholder="you@mavs.uta.edu or you@uta.edu"
                                required
                            />
                            <p className="auth-account-note">Use @mavs.uta.edu for students or @uta.edu for faculty.</p>
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" autoComplete="new-password" required />
                            <button className="auth-submit" type="submit" disabled={submitting}>
                                {submitting ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>
                    )}
                    {authError && <p className="auth-error" role="alert">{authError}</p>}
                </div>
            </section>
        </main>
    )
}

export default LoginPage;
