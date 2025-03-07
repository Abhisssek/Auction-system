const Auction = require("../models/auctionSchema");
const PaymentProof = require("../models/commissionProofSchema");
const User = require("../models/userSchema");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary");

exports.calculateCommission = async (auctionId) => {
    const auction = await Auction.findById(auctionId);
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({ message: "Invalid Auction ID" });
    }
    const commissionRate = 0.05;
    const commission = auction.currentbid * commissionRate;
    return commission;
  };
  
  exports.proofOfCommission =  async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files were uploaded." });
    }
    const { proof } = req.files;
    const { amount, comment } = req.body;
    const user = await User.findById(req.user._id);
  
    if (!amount || !comment) {
      return res.status(400).json({message: "Please enter the amount and comment."});
    }
  
    if (user.unpaidCommission === 0) {
      return res.status(200).json({
        success: true,
        message: "You don't have any unpaid commissions.",
      });
    }
  
    if (user.unpaidCommission < amount) {
      return res.status(400).json({
        message: "The amount you entered is greater than your unpaid commission.",})
    }
  
    const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedFormats.includes(proof.mimetype)) {
      return res.status(400).json({
        message: "Invalid file format. Only 'png', 'jpeg', 'webp' images are allowed.",})
    }
  
    const cloudinaryResponse = await cloudinary.uploader.upload(
      proof.tempFilePath,
      {
        folder: "MERN_AUCTION_PAYMENT_PROOFS",
      }
    );
    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error(
        "Cloudinary error:",
        cloudinaryResponse.error || "Unknown cloudinary error."
      );
      return res.status(500).json({message: "An error occurred while uploading the proof."});
    }
    const commissionProof = await PaymentProof.create({
      userid: req.user._id,
      proof: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
      amount,
      comment,
    });
    res.status(201).json({
      success: true,
      message:
        "Your proof has been submitted successfully. We will review it and responed to you within 24 hours.",
      commissionProof,
    });
  };