import React from "react";
import { Navbar } from "../Navbar/Navbar";
import { useState, useEffect } from "react";
import "./UpdateAccount.css";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const UpdateAccount = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profilename, setProfilename] = useState("");
  // const [username, setUsername] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  const [profileimage, setProfileimage] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

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

  const handleUpdate = async (e) => {
    e.preventDefault(); // ✅ Prevent form reload
    try {
      const formData = new FormData();
      formData.append("profileImage", profileimage);
      formData.append("profilename", profilename);
      // formData.append("username", username);
      // formData.append("email", email);
      // formData.append("password", password);
      formData.append("phone", phone);
      formData.append("address", address);

      const response = await fetch(
        "http://localhost:3000/api/v1/user/profile/update",
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        }
      );

      if(response.status === 404){
        toast.error("User not found", {
          position: "top-right",
          autoClose: 4000,
        });

      }
      if(response.status === 405){
        toast.error("image file format is not valid", {
          position: "top-right",
          autoClose: 4000,
        });

      }


      if (response.ok) {
        toast.success("Account updated successfully");
        setTimeout(() => {
          navigate("/myaccount");
        }, 2000);
      } else {
        toast.error("Failed to update account", {
          position: "top-right",
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };


  const changePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/user/password/update",
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json", // ✅ Send JSON data
          },
          body: JSON.stringify({
            oldPassword,
            newPassword,
          }),
        }
      );
  
      const data = await response.json();
  
      if (response.status === 400) {
        toast.error(data.message || "Invalid request");
        return;
      }
      if (response.status === 404) {
        toast.error(data.message || "User not found");
        return;
      }
  
      if (response.ok) {
        toast.success("Password changed successfully");
        setTimeout(() => navigate("/myaccount"), 2000);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong. Try again.");
    }
  };
  
  

  return (
    <div>
      <Navbar />
      <ToastContainer position="top-right" autoClose={4000} />  {/* ✅ Always present */}
  
      {isAuthenticated ? (
        <div className="update-acc">
          <div className="container">
            <div className="update-acc-content">
              <div className="update-details">
                <h1>Update Account Details</h1>
                <form onSubmit={handleUpdate}>
                  <div className="profileimage-reg">
                    <label>Profile Image</label>
                    <input
                      className="form-control"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfileimage(e.target.files[0])}
                    />
                  </div>
  
                  <div className="profilename-reg">
                    <label>Profile Name *</label>
                    <input
                      type="text"
                      value={profilename}
                      onChange={(e) => setProfilename(e.target.value)}
                    />
                  </div>
  
                  <div className="phone-reg">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
  
                  <div className="address-reg">
                    <label>Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
  
                  <button type="submit" className="primary-btn update-btn">
                    Update Account
                  </button>
                </form>
              </div>
              <div className="change-password">
                <h1>Change Password</h1>
                <form onSubmit={changePassword}>
                  <div className="old-password">
                    <label>Old Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      // required
                    />
                  </div>
  
                  <div className="new-password">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      // required
                    />
                  </div>
  
                  <button type="submit" className="primary-btn password-btn">
                    Change Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null }
    </div>
  );
};
