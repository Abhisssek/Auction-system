const User = require("../models/userSchema");
// const catchAsyncErrors = require("../middleware/catchAsyncErrors");
// const ErrorHandler = require("../middleware/error");
const cloudinary = require("cloudinary");
// const generateToken = require("../utils/jwt");
require("dotenv").config();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const stripe = require('../config/stripe');

// Register a user => /api/v1/register
exports.register = async (req, res) => {
  try {
    let profileImageUrl = null;
    let profileImagePublicId = null;

    if (req.files && req.files.profileImage) {
      console.log("Received files:", req.files);

      const { profileImage } = req.files;
      const allowedFormats = ["image/png", "image/jpeg", "image/webp"];

      if (!allowedFormats.includes(profileImage.mimetype)) {
        return res.status(400).json({
          message: "Invalid file format. Please upload a valid image file.",
        });
      }

      // Upload to Cloudinary if a file is uploaded
      try {
        const cloudinaryResponse = await cloudinary.uploader.upload(
          profileImage.tempFilePath,
          {
            folder: "MERN_AUCTION_PLATFORM_USERS",
            
          }
        );

        console.log("Cloudinary Upload Response:", cloudinaryResponse);


        if (cloudinaryResponse && !cloudinaryResponse.error) {
          profileImageUrl = cloudinaryResponse.secure_url;
          profileImagePublicId = cloudinaryResponse.public_id;
        } else {
          console.error(
            "Cloudinary error:",
            cloudinaryResponse.error || "Unknown cloudinary error."
          );
          return res
            .status(500)
            .json({ message: "Image upload failed. Try again later." });
        }
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        return res.status(500).json({ message: "Error uploading image." });
      }
    }

    // Extract user details
    const {
      username, // Ensure this matches your schema
      profilename,
      email,
      password,
      phone,
      address,
      role,
    } = req.body;

    if (
      !username ||
      !profilename ||
      !email ||
      !phone ||
      !password ||
      !address ||
      !role
    ) {
      return res.status(400).json({ message: "Please fill all the fields." });
    }

 

    const isRegistered = await User.findOne({ email });
    if (isRegistered) {
      return res.status(400).json({ message: "User already registered." });
    }

    const takenUsername = await User.findOne({ username });
    if (takenUsername) {
      return res.status(400).json({ message: "Username already taken." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    

    let stripeAccount = await stripe.accounts.create({
      type: "standard",  // Change from "express" to "standard"
      email: email,
      country: "US",  // India
      capabilities: {
        card_payments: { requested: true }, 
        transfers: { requested: true }  // Enable transfers
      }
    });


    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.id,
      refresh_url: "http://localhost:3000/reauth",
      return_url: "http://localhost:3000/dashboard",
      type: "account_onboarding",
    });

    // Create user with optional profile image
    const user = await User.create({
      username,
      profilename,
      email,
      password: hashedPassword,
      phone,
      address,
      role,
      profileImage: profileImageUrl
        ? { public_id: profileImagePublicId, url: profileImageUrl }
        : { public_id: "", url: "" }, // Default empty values instead of undefined
      
      stripeAccountId: stripeAccount.id,
      url: accountLink.url
    });

    // generateToken(user);

    //generate token for user

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true, // Prevents JavaScript access
    secure: false, // Set to true if using HTTPS
    // sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

    return res.status(201)
      .json({
        success: true,
        token, // Also returning in JSON if needed
        user,
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Login user => /api/v1/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }



  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // ✅ Set to true in production
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({ message: "Login successful!" });
};


// Logout user => /api/v1/logout
exports.logout = async (req, res) => {
  try {

    if(!req.cookies.token){
      return res.status(400).json({ message: "You are not logged in." });
    }

    res
      .cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      })
      .status(200)
      .json({
        success: true,
        message: "Logged out successfully.",
      });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin-only route: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { username, profilename, email, phone, address } = req.body;
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profileImageUrl = user.profileImage?.url || null;
    let profileImagePublicId = user.profileImage?.public_id || null;

    // Check if a new profile image is uploaded
    if (req.files && req.files.profileImage) {
      const profileImage = req.files.profileImage; // ✅ Define `profileImage`
      const allowedFormats = ["image/png", "image/jpeg", "image/webp"];

      if (!allowedFormats.includes(profileImage.mimetype)) {
        return res.status(400).json({ message: "Invalid file format." });
      }

      // Delete old image if it exists
      if (profileImagePublicId) {
        await cloudinary.uploader.destroy(profileImagePublicId);
      }

      // Upload new image
      const cloudinaryResponse = await cloudinary.uploader.upload(profileImage.tempFilePath, {
        folder: "MERN_AUCTION_PLATFORM_USERS",
      });

      if (!cloudinaryResponse.error) {
        profileImageUrl = cloudinaryResponse.secure_url;
        profileImagePublicId = cloudinaryResponse.public_id;
      } else {
        return res.status(500).json({ message: "Image upload failed." });
      }
    }

    // Update user fields
    user.username = username || user.username;
    user.profilename = profilename || user.profilename;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.profileImage = profileImageUrl ? { public_id: profileImagePublicId, url: profileImageUrl } : user.profileImage;

    await user.save();

    res.status(200).json({ success: true, message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Update user password
exports.updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Please enter old and new password." });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatched) {
      return res.status(400).json({ message: "Invalid old password." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
