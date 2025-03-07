const Auction = require("../models/auctionSchema");  // Import Auction model
const User = require("../models/userSchema");  // Import User model
const stripe = require("../config/stripe");  // Import Stripe

exports.createCheckoutSession = async (req, res) => {
  try {
    const { auctionId, bidAmount, auctioneerId } = req.body;

    // Find the auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Get the current highest bid and bidder
    const currentHighestBid = auction.currentbid;
    const highestBidder = auction.highestbidder; // Store user ID of highest bidder
    // console.log(currentHighestBid);
    
    // Ensure the bid amount is exactly the highest bid
    if (bidAmount !== currentHighestBid) {
      return res.status(400).json({ message: "Bid amount must match the highest bid" });
    }
    // console.log(bidAmount);
    

    // Ensure the user making the payment is the highest bidder
    if (req.user.id !== highestBidder.toString()) {
      return res.status(403).json({ message: "Only the highest bidder can make the payment" });
    }

    // Find the auctioneer
    const auctioneer = await User.findById(auctioneerId);
    if (!auctioneer || !auctioneer.stripeAccountId) {
      return res.status(400).json({ message: "Auctioneer is not set up for payments" });
    }

    if(auction.status==="Active"){
        return res.status(400).json({ message: "Auction is still active you cant make payment" });
    }
    console.log(auction.status);
    

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Auction Bid Payment",
            },
            unit_amount: bidAmount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000/success",  // Redirect after payment
      cancel_url: "http://localhost:3000/cancel",
      payment_intent_data: {
        application_fee_amount: (bidAmount * 0.05) * 100, // 5% commission for admin
        transfer_data: {
          destination: auctioneer.stripeAccountId,
        },
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: "Payment failed", error: error.message });
  }
};
