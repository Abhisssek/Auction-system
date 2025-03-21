const Auction = require("../models/auctionSchema");
const Bid = require("../models/bidSchema");
const User = require("../models/userSchema");

exports.placeBid = async (req, res) => {
  try {
    const { id } = req.params; // Auction ID
    const auctionItem = await Auction.findById(id);

    if (!auctionItem) {
      return res.status(404).json({ message: "Auction item not found" });
    }

    const { amount } = req.body;

    // Validate amount
    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }
    if (amount <= auctionItem.currentbid) {
      return res
        .status(400)
        .json({ message: "Bid amount should be greater than current bid" });
    }
    if (amount <= auctionItem.startingprice) {
      return res
        .status(400)
        .json({ message: "Bid amount should be greater than starting price" });
    }

    // Prevent a bidder from bidding again unless someone else has bid
    if (auctionItem.highestbidder?.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You can't bid again until another user bids" });
    }

    // Check if the user has already placed a bid in this auction
    const existingBid = await Bid.findOne({
      bidder: req.user._id,
      auctionitem: auctionItem._id,
    });

    if (existingBid) {
      existingBid.amount = amount;
      await existingBid.save();
    } else {
      await Bid.create({
        amount,
        bidder: req.user._id,
        auctionitem: auctionItem._id,
      });

      auctionItem.bids.push({
        user: req.user._id,
        amount,
        time: new Date(),
      });
    }

    // Update highest bidder and current bid
    auctionItem.currentbid = amount;
    auctionItem.highestbidder = req.user._id;
    await auctionItem.save();

    const auctionBids = await Bid.find({ auctionitem: auctionItem._id })
      .sort({ amount: -1 })
      .populate("bidder", "name email");



    // 🔥 Emit event to update all clients in real time
    const io = req.app.get("socketio");
    io.emit("updateBid", {
      auctionId: auctionItem._id,
      currentbid: auctionItem.currentbid,
      highestbidder: auctionItem.highestbidder,
      auctionBids,
    });

    res.status(201).json({
      success: true,
      message: "Bid placed successfully.",
      currentbid: auctionItem.currentbid,
      highestbidder: auctionItem.highestbidder,
      auctionBids,
    });
  } catch (error) {
    console.error("Error placing bid:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
