import { useState } from "react";

import LeightonLogo from "../components/LeightonLogo";
import { authRoles, loginUser, registerUser } from "../services/authService";

function Login() {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "Site Engineer",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      if (mode === "register") {
        await registerUser(formData);
      } else {
        await loginUser(formData);
      }
    } catch (error) {
      console.error(error);
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        setErrorMessage("This email already exists, but the password does not match.");
      } else if (error.code === "auth/operation-not-allowed") {
        setErrorMessage("Enable Email/Password sign-in in Firebase Authentication.");
      } else if (error.code === "auth/weak-password") {
        setErrorMessage("Password must be at least 6 characters.");
      } else {
        setErrorMessage("Authentication failed. Please check the details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow">
        <LeightonLogo compact />
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {mode === "register" ? "Create Account" : "Secure Login"}
        </h1>
        <p className="mt-2 text-slate-600">
          Sign in to access planning, progress, actual tracking, and reports.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border p-4"
            value={formData.email}
            onChange={(event) =>
              setFormData({
                ...formData,
                email: event.target.value,
              })
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border p-4"
            value={formData.password}
            onChange={(event) =>
              setFormData({
                ...formData,
                password: event.target.value,
              })
            }
            required
          />

          {mode === "register" && (
            <select
              className="w-full rounded-lg border p-4"
              value={formData.role}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  role: event.target.value,
                })
              }
            >
              {authRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-red-50 p-3 font-semibold text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 p-4 font-semibold text-white"
          >
            {loading ? "Please wait..." : mode === "register" ? "Register" : "Login"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setErrorMessage("");
          }}
          className="mt-5 w-full rounded-lg bg-slate-100 p-3 font-semibold text-slate-700"
        >
          {mode === "register" ? "Use Existing Account" : "Create New Account"}
        </button>
      </div>
    </div>
  );
}

export default Login;
