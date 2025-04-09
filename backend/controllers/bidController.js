const Auction = require("../models/auctionSchema");
const Bid = require("../models/bidSchema");
const User = require("../models/userSchema");

exports.placeBid = async (req, res) => {
  try {
    const { id } = req.params; // Auction ID
    // console.log("🔵 Auction ID:", id);

    const auctionItem = await Auction.findById(id);
    if (!auctionItem) {
      // console.log("🔴 Auction not found!");
      return res.status(404).json({ message: "Auction item not found" });
    }
    // console.log("🟢 Auction found:", auctionItem._id);

    const { amount } = req.body;
    if (!amount) {
      // console.log("🔴 Amount is missing!");
      return res.status(400).json({ message: "Amount is required" });
    }

    if (amount <= auctionItem.currentbid) {
      // console.log("🔴 Bid amount too low:", amount);
      return res
        .status(400)
        .json({ message: "Bid amount should be greater than current bid" });
    }

    if (amount <= auctionItem.startingprice) {
      // console.log("🔴 Bid below starting price:", amount);
      return res
        .status(400)
        .json({ message: "Bid amount should be greater than starting price" });
    }

    if (auctionItem.highestbidder?.toString() === req.user._id.toString()) {
      // console.log("🔴 Same bidder is trying again:", req.user._id);
      return res
        .status(400)
        .json({ message: "You can't bid again until another user bids" });
    }

    // console.log("🟢 Passed all bid validation checks.");

    // Fetch user profile
    const user = await User.findById(req.user._id).select("profilename");
    // console.log("🟢 Fetched user:", user);

    const profilename = user?.profilename?.toString() || "Unknown Bidder";
    // console.log("🟢 Final biddername:", profilename);

    // Check if user already placed a bid
    const existingBid = await Bid.findOne({
      bidder: req.user._id,
      auctionitem: auctionItem._id,
    });

    if (existingBid) {
      // console.log("🟡 Updating existing bid...");
      existingBid.amount = amount;
      existingBid.biddername = profilename;
      await existingBid.save();
      // console.log("🟢 Existing bid updated.");
    } else {
      // console.log("🟡 Creating new bid...");
      const bidData = {
        amount,
        bidder: req.user._id,
        biddername: profilename,
        auctionitem: auctionItem._id,
      };

      await Bid.create(bidData);
      // console.log("🟢 New bid created.");
    }

    // Ensure `bids` array exists
    if (!Array.isArray(auctionItem.bids)) {
      // console.log("🔴 Bids array is missing, initializing...");
      auctionItem.bids = [];
    }

    // console.log("🟡 Before pushing bid, bids length:", auctionItem.bids.length);

    try {
      auctionItem.bids.push({
        bidder: req.user._id,
        biddername: profilename,
        amount,
        time: new Date(),
      });
      // console.log("🟢 Bid pushed to auctionItem.bids.");
    } catch (pushError) {
      console.error("❌ Error pushing bid:", pushError);
    }

    try {
      await auctionItem.save();
      // console.log("🟢 Auction updated successfully.");
    } catch (saveError) {
      console.error("❌ Error saving auction:", saveError);
    }

    auctionItem.currentbid = amount;
    auctionItem.highestbidder = req.user._id;
    await auctionItem.save();

    const auctionBids = await Bid.find({ auctionitem: auctionItem._id })
      .sort({ amount: -1 })
      .populate("bidder");

    // console.log("🟢 Auction bids fetched.");

    const io = req.app.get("socketio"); // ✅ Get the socket instance

    io.to(auctionItem._id.toString()).emit("updateBid", {  // ✅ Emit to the auction room only
      auctionId: auctionItem._id,
      currentbid: auctionItem.currentbid,
      highestbidder: auctionItem.highestbidder,
      auctionBids,
    });
    
    console.log("🟢 Bid event emitted for auction:", auctionItem._id);
    

    // console.log("🟢 Bid event emitted.");

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully.",
      currentbid: auctionItem.currentbid,
      highestbidder: auctionItem.highestbidder,
      auctionBids,
    });
  } catch (error) {
    console.error("❌ Error placing bid:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getBidOfAuction = async (req, res) => {
  try {
    const { id } = req.params; // Auction ID
    const auctionItem = await Auction.findById(id);

    if (!auctionItem) {
      return res.status(404).json({ message: "Auction item not found" });
    }

    const auctionBids = await Bid.find({ auctionitem: auctionItem._id })
      .sort({ amount: -1 })
      .populate("bidder", "name email");

    res.status(200).json({
      success: true,
      message: "Bids fetched successfully.",
      auctionBids,
    });
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
