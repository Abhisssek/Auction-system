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

    const { images } = req.files; // Handle multiple images
    const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];
    console.log("Received files:", req.files);


    let imageArray = Array.isArray(images) ? images : [images]; // Ensure it's an array
    let uploadedImages = [];

    for (const image of imageArray) {
      if (!allowedFormats.includes(image.mimetype)) {
        return res.status(400).json({
          msg: "Invalid file format. Please upload valid image files.",
        });
      }

      const cloudinaryResponse = await cloudinary.uploader.upload(
        image.tempFilePath,
        { folder: "MERN_AUCTION_PLATFORM_AUCTIONS" }
      );

      if (!cloudinaryResponse || cloudinaryResponse.error) {
        console.error(
          "Cloudinary error:",
          cloudinaryResponse.error || "Unknown Cloudinary error."
        );
        return res.status(500).json({ msg: "Failed to upload auction images" });
      }

      uploadedImages.push({
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
      });
    }

    const {
      title,
      description,
      category,
      condition,
      startingBid,
      startTime,
      endingTime,
      artcreater,
      artstyle,
      artmadedate,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !condition ||
      !startingBid ||
      !startTime ||
      !endingTime ||
      !artcreater ||
      !artstyle ||
      !artmadedate
    )
      return res.status(400).json({ msg: "Please fill in all fields." });

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
      status: "Active",
    });

    if (alreadyOneAuctionActive)
      return res
        .status(400)
        .json({ msg: "You already have an active auction." });

    
    
        
        
        const newAuction = new Auction({
          title,
          description,
      category,
      condition,
      artcreater,
      artstyle,
      artmadedate,
      startingprice: startingBid,
      starttime: new Date(startTime),
      endtime: new Date(endingTime),
      images: uploadedImages, // Store multiple images
      createdby: req.user.id,
      sellername: User.profilename
    });
    console.log("Uploaded images array:", uploadedImages);
    
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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Invalid auction ID." });
    }

    // Find the auction
    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ msg: "Auction not found." });
    }

    // Check if the user is the auction creator
    if (auction.createdby.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized to delete this auction." });
    }

    // Delete auction images from Cloudinary
    if (auction.images && auction.images.length > 0) {
      for (const img of auction.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    // Delete auction from the database
    await Auction.deleteOne({ _id: id });

    return res.status(200).json({ msg: "Auction deleted successfully." });
  } catch (error) {
    console.error("Error deleting auction:", error);
    return res.status(500).json({ msg: "Internal server error." });
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