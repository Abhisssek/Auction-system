import React, { useState, useEffect } from "react";
import { Navbar } from "../Navbar/Navbar.jsx";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "./MyAccount.css";
import { Link } from "react-router-dom";

export const MyAccount = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileImg, setProfileImg] = useState(null);
  const [profilename, setProfilename] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("bidder");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState({ user: {} });
  const [userData, setUserData] = useState({});

  const navigate = useNavigate();

  // ✅ Check if user is authenticated using cookies
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/v1/user/profile",
          {
            method: "GET",
            credentials: "include", // ✅ Send cookies
          }
        );

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // ✅ Register User
  const handleRegister = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("profileImage", profileImg);
    formData.append("profilename", profilename);
    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("role", role);

    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/user/register",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      console.log(data);
      

      if (response.ok) {
        toast.success("Registration successful! Now Login to continue.");
        // localStorage.setItem("token", data.token);
        setTimeout(() => navigate("/"), 4000);
      } else {
        toast.error(
          data.error || "Registration failed! Please check your credentials."
        );
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Registration error:", error);
    }
  };

  // ✅ Login User
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:3000/api/v1/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // ✅ Send cookies
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Login successful! Redirecting...");
        setIsAuthenticated(true);
        setTimeout(() => navigate("/myaccount"), 2000);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(
          data.error || "Login failed! Please check your credentials."
        );
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Login error:", error);
    }
  };

  // ✅ Logout User
  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/v1/user/logout", {
        method: "GET", // ✅ Change to GET
        credentials: "include", // ✅ Ensure cookies are sent
      });

      if (response.ok) {
        setIsAuthenticated(false);
        toast.info("Logged out successfully.");

        // ✅ Reload page to fully clear authentication state
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch (error) {
      toast.error("Logout failed. Please try again.");
      console.error("Logout error:", error);
    }
  };

  // ✅ Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      console.log("Fetching profile...");

      try {
        const response = await fetch(
          "http://localhost:3000/api/v1/user/profile",
          {
            method: "GET",
            credentials: "include", // ✅ Send cookies
          }
        );

        console.log("Full response:", response);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Error ${response.status}: ${
              errorData.error || response.statusText
            }`
          );
        }
        const datas = await response.json();
        setUserData(datas.user);
        console.log("Profile data:", datas);
      } catch (error) {
        console.error("Profile fetch error:", error.message);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="my-account">
          <h1>My Account</h1>
          {isAuthenticated ? (
            <>
              <div className="profile-container bg-dark text-white p-4 rounded">
                <div className="profile-header">
                  <img
                    className="profile-img rounded-circle"
                    src={
                      userData.profileImage?.url ||
                      "https://st3.depositphotos.com/15648834/17930/v/600/depositphotos_179308454-stock-illustration-unknown-person-silhouette-glasses-profile.jpg"
                    }
                    alt="Profile"
                    width="150"
                  />
                  <h2 className="mt-3">{userData.profilename}</h2>
                  <p className="text-yellow email">{userData.email}</p>
                  <button
                    className="btn btn-danger mt-2"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>

                <div className="profile-details mt-4">
                  <h3>Personal Information</h3>
                  <hr />
                  <p>
                    <strong>Username:</strong> {userData.username}
                  </p>
                  <p>
                    <strong>Role:</strong> {userData.role}
                  </p>
                  <p>
                    <strong>Phone:</strong> {userData.phone}
                  </p>
                  <p>
                    <strong>Address:</strong> {userData.address}
                  </p>

                  <h3 className="mt-4">Auction Details</h3>
                  <hr />
                  <p>
                    <strong>Auction Won:</strong> {userData.auctionWon}
                  </p>
                  <p>
                    <strong>Money Spent:</strong> ${userData.moneySpent}
                  </p>
                  <p>
                    <strong>Unpaid Commission:</strong> $
                    {userData.unpaidCommission}
                  </p>

                  <h3 className="mt-4">Stripe Payment Info</h3>
                  <hr />
                  <p>
                    <strong>Stripe Account ID:</strong>{" "}
                    {userData.stripeAccountId}
                  </p>
                  <div className="update-acc mt-5">
                  <Link to="/update-account"><button className="update-btn secondary-btn ">Update Details/Password</button></Link>
                
                </div>
                </div>
               
              </div>
            </>
          ) : (
            <>
              {/* ✅ Login Form */}
              <div className="reg-login">
                <div className="login">
                  <form method="POST" onSubmit={handleSubmit}>
                    <h1>Login</h1>
                    <div className="email-log">
                      <label>Email</label>
                      <input
                        type="email"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="password-log">
                      <label>Password</label>
                      <input
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="login-btn primary-btn">
                      Login
                    </button>
                  </form>
                </div>

                {/* ✅ Register Form */}
                <div className="register">
                  <h1>Register</h1>
                  <form method="POST" onSubmit={handleRegister}>
                    <div className="profileimg-reg">
                      <label>Profile Image</label>
                      <input className="form-control"
                        type="file"
                        onChange={(e) => setProfileImg(e.target.files[0])}
                      />
                    </div>
                    <div className="profilename-reg">
                      <label>Profile Name *</label>
                      <input
                        type="text"
                        value={profilename}
                        onChange={(e) => setProfilename(e.target.value)}
                        required
                      />
                    </div>
                    <div className="username-reg">
                      <label>Username *</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="email-reg">
                      <label>Email *</label>
                      <input
                        type="email"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="password-reg">
                      <label>Password *</label>
                      <input
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="phone-reg">
                      <label>Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="address-reg">
                      <label>Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                    </div>
                    <div className="role-reg">
                      <label>Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="bidder">Bidder</option>
                        <option value="auctioneer">Auctioneer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button type="submit" className="primary-btn register-btn">
                      Register
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={4000} />
    </div>
  );
};
