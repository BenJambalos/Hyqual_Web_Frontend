import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { ACTIVE_AUTH_SESSION_KEY, hasActiveAuthSession } from "../utils/authSession";

import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import logoIcon from "../assets/hyqual-logo-icon.png";
import logoText from "../assets/hyqual-logo-text.png";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(location.state?.reason || "");
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const isSigningIn = useRef(false);

  useEffect(() => {
    let active = true;
    api.currentUser().then(({ user }) => {
      if (!active || isSigningIn.current) return;
      if (!hasActiveAuthSession()) {
        api.logout().catch((error) => console.error("Unable to clear a restored session:", error));
        return;
      }
      if (active) {
        localStorage.setItem("hyqual_user", JSON.stringify(user));
        navigate(user.role === "Superadmin" ? "/superadmin/overview" : "/dashboard", {
          replace: true,
        });
      }
    }).catch((error) => {
      if (error.status !== 401) console.error("Unable to check the existing session:", error);
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    isSigningIn.current = true;

    try {
      const { user } = await api.login(email, password);

      sessionStorage.setItem(ACTIVE_AUTH_SESSION_KEY, "true");
      localStorage.setItem("hyqual_user", JSON.stringify(user));
      if (user.role === "Superadmin") {
        navigate("/superadmin/overview");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      isSigningIn.current = false;
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");

    const trimmedEmail = resetEmail.trim();

    if (!trimmedEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    try {
      await api.requestPasswordReset(trimmedEmail);
      setResetMessage("If the account exists, a password reset link will be sent to the email address.");
      setResetEmail("");
    } catch (err) {
      console.error("Password reset error:", err);
      setResetError(err.message || "Unable to send reset email. Please try again.");
    }
  };

  const handleForgotPasswordClick = () => {
    setIsResetMode(true);
    setResetError("");
    setResetMessage("");
    setEmail("");
  };

  const handleBackToLogin = () => {
    setIsResetMode(false);
    setResetError("");
    setResetMessage("");
    setResetEmail("");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src={logoIcon} alt="HyQual icon" className="logo-icon" />
          <img src={logoText} alt="HyQual" className="logo-text-img" />
        </div>

        {!isResetMode ? (
          <>
            <h1>Sign in to your portal</h1>

            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="sign-in-btn">
                Sign In <ArrowRight size={18} />
              </button>
            </form>

            <button
              type="button"
              className="forgot-password"
              onClick={handleForgotPasswordClick}
            >
              Forgot Password?
            </button>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="subtext">
              Enter the email address for your account and we’ll send a reset link.
            </p>

            <form onSubmit={handleForgotPassword}>
              <label htmlFor="reset-email">Email address</label>
              <input
                id="reset-email"
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />

              {resetError && <p className="login-error">{resetError}</p>}
              {resetMessage && <p className="login-success">{resetMessage}</p>}

              <button type="submit" className="sign-in-btn reset-btn">
                Send Reset Link
              </button>
            </form>

            <button
              type="button"
              className="forgot-password back-to-login"
              onClick={handleBackToLogin}
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
