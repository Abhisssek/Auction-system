const { mongoose } = require("mongoose");
const Auction = require("../models/auctionSchema");
const Bid = require("../models/bidSchema");
const User = require("../models/userSchema");
const cloudinary = require("cloudinary").v2;

// Create a new auction
exports.addNewAuctionItem = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0)
      return res.status(400).json({ msg: "No files were uploaded." });

    const { image } = req.files;
    const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedFormats.includes(image.mimetype))
      return res.status(400).json({
        msg: "Invalid file format. Please upload a valid image file.",
      });

    const {
      title,
      description,
      category,
      condition,
      startingBid,
      startTime,
      endingTime,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !condition ||
      !startingBid ||
      !startTime ||
      !endingTime
    )
      return res.status(400).json({ msg: "Please fill in all fields." });

    // Convert string timestamps to Date objects
    if (new Date(startTime) < Date.now()) {
      return res
        .status(400)
        .json({ msg: "Auction starting time must be in the future." });
    }
    if (new Date(startTime) >= new Date(endingTime)) {
      return res
        .status(400)
        .json({ msg: "Auction ending time must be after the starting time." });
    }
    const alreadyOneAuctionActive = await Auction.findOne({
      createdby: req.user.id,
      endtime: { $gte: new Date() },
    });

    if (alreadyOneAuctionActive)
      return res
        .status(400)
        .json({ msg: "You already have an active auction." });

    const cloudinaryResponse = await cloudinary.uploader.upload(
      image.tempFilePath,
      {
        folder: "MERN_AUCTION_PLATFORM_AUCTIONS",
      }
    );
    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error(
        "Cloudinary error:",
        cloudinaryResponse.error || "Unknown cloudinary error."
      );
      return res.status(500).json({ msg: "failed to upload auction image" });
    }

    const newAuction = new Auction({
      title,
      description,
      category,
      condition,
      startingprice: startingBid, // Fixing 'startingprice' field
      starttime: new Date(startTime), // Fix field name
      endtime: new Date(endingTime), // Fix field name
      image: {
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
      },
      createdby: req.user.id,
    });

    await newAuction.save();
    return res
      .status(201)
      .json({ msg: "Auction created successfully.", newAuction });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.getAllAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find();
    return res.status(200).json(auctions);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.getAuctionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ msg: "Invalid auction id." });

    const auctionItem = await Auction.findById(id);
    if (!auctionItem)
      return res.status(404).json({ msg: "Auction not found." });

    const bidders = auctionItem.bids.sort((a, b) => b.amount - a.amount);
    return res.status(200).json({ auctionItem, bidders });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.getMyAuctions = async (req, res) => {
  try {
    const now = new Date();

    // Find all auctions created by the logged-in auctioneer
    const myAuctions = await Auction.find({ createdby: req.user.id })
      .sort({ starttime: -1 }) // Sort by start time (latest first)
      .lean(); // Convert to plain JS objects

    // Update auction status based on end time
    const updatedAuctions = myAuctions.map((auction) => ({
      ...auction,
      status: auction.endtime < now ? "Inactive" : "Active",
    }));

    return res.status(200).json(updatedAuctions);
  } catch (error) {
    console.error("Error fetching my auctions:", error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.removeAuction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ msg: "Invalid auction id." });

    const auction = await Auction.findById(id);
    if (!auction) return res.status(404).json({ msg: "Auction not found." });

    if (auction.createdby.toString() !== req.user.id)
      return res
        .status(403)
        .json({ msg: "Unauthorized to delete this auction." });

    // Delete the auction image from cloudinary
    await cloudinary.uploader.destroy(auction.image.public_id);

    await Auction.deleteOne({ _id: id });
    return res.status(200).json({ msg: "Auction deleted successfully." });
  } catch (error) {
    console.error("Error deleting auction:", error);
    return res.status(500).json({ msg: error.message });
  }
};

exports.republishAuction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ msg: "Invalid auction id." });

    let auctionItem = await Auction.findById(id);
    if (!auctionItem)
      return res.status(404).json({ msg: "Auction not found." });

    if (auctionItem.createdby.toString() !== req.user.id)
      return res
        .status(403)
        .json({ msg: "Unauthorized to republish this auction." });

    if (!req.body.startTime || !req.body.endTime) {
      return res
        .status(400)
        .json({ msg: "Please provide start and end times for republish." });
    }
    
    if (new Date(auctionItem.endtime) > Date.now()) {
      return res
        .status(400)
        .json({ msg: "Auction is still active, can't republish." });
    }

    // ✅ Check if any bids exist
    const existingBids = await Bid.find({ auctionItem: auctionItem._id });
    if (existingBids.length > 0) {
      return res.status(400).json({ msg: "Auction cannot be republished as bids have been placed." });
    }

    let data = {
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    };

    if (data.startTime < Date.now()) {
      return res
        .status(400)
        .json({ msg: "Auction starting time must be in the future." });
    }
    if (data.startTime >= data.endTime) {
      return res
        .status(400)
        .json({ msg: "Auction ending time must be after the starting time." });
    }

    data.bids = [];
    data.highestbidder = null;
    data.currentbid = auctionItem.startingprice;
    data.commisioncalculated = false;
    data.status = "Active";

    auctionItem = await Auction.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    return res.status(200).json({ msg: "Auction republished successfully.", auctionItem });
  } catch (error) {
    console.error("Error republishing auction:", error);
    return res.status(500).json({ msg: error.message });
  }
};