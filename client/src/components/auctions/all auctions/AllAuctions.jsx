import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "./AllAuctions.css";
import { Navbar } from "../../Navbar/Navbar";
import {
  getTimeRemaining,
  getAuctionStatus,
  formatTime,
} from "../../../../utils/AuctionUtils";

// Initialize Socket.io connection
const socket = io("http://localhost:3000");

export const AllAuctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // Fetch all auctions on mount
  useEffect(() => {
    fetchAuctions();
    fetchProfile(); // Fetch user role and ID
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/v1/auction/allitems", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch auctions");
      }

      const data = await response.json();
      data.sort((a, b) => new Date(b.starttime) - new Date(a.starttime));

      // Ensure each auction has a currentbid property
      const updatedData = data.map((auction) => ({
        ...auction,
        currentbid: auction.currentbid ?? auction.startingprice,
      }));

      setAuctions(updatedData);
    } catch (error) {
      console.error("Error fetching auctions:", error);
    }
  };

  // Fetch user role and ID
  const fetchProfile = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/v1/user/profile", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setUserRole(data.user.role);
      setUserId(data.user._id);
    } catch (error) {
      console.error("Profile fetch error:", error.message);
    }
  };

  // Listen for real-time bid updates
  useEffect(() => {
    const handleBidUpdate = (updatedAuction) => {
      setAuctions((prevAuctions) =>
        prevAuctions.map((auction) =>
          auction._id === updatedAuction.auctionId
            ? { ...auction, currentbid: updatedAuction.currentbid }
            : auction
        )
      );
    };

    socket.on("updateBid", handleBidUpdate);
    return () => socket.off("updateBid", handleBidUpdate);
  }, []);

  return (
    <div className="auctions-container">
      <Navbar />
      <h2>All Auctions</h2>
      <div className="auctions-grid">
        {auctions.map((auction) => (
          <div key={auction._id} className="auction-card">
            <img
              src={auction.images?.length > 0 ? auction.images[0].url : "fallback-image-url"}
              alt={auction.title}
              className="auction-image"
              onClick={() => navigate(`/auction/${auction._id}`)}
              style={{ cursor: "pointer" }}
            />
            <div className="auction-text">
              <h3
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/auction/${auction._id}`)}
                className="auction-title"
              >
                {auction.title}
              </h3>
              <p className="auction-description">{auction.description}</p>
              <p className="auction-price">
                Artist: <span className="auction-text-span">{auction.artcreater}</span>
              </p>
              <p className="auction-price">
                Category: <span className="auction-text-span">{auction.category}</span>
              </p>
              <p className="auction-price">
                Starting Price: <span style={{ fontWeight: "700" }}>${auction.startingprice}</span>
              </p>
              
              <AuctionCountdown auction={auction} />

              {/* ✅ If the user is an auctioneer, show bid history instead of bid button */}
              {userRole === "auctioneer" && userId === auction.createdby ? (
                // <BidHistory bids={auction.bidhistory} />
                null
              ) : (
                <button onClick={() => navigate(`/auction/${auction._id}`)} className="bid-btn secondary-btn">
                  Start Bidding
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Auction Countdown Timer with Status Indicator
const AuctionCountdown = ({ auction }) => {
  const [timeLeft, setTimeLeft] = useState(
    getTimeRemaining(auction.starttime, auction.endtime)
  );
  const [status, setStatus] = useState(
    getAuctionStatus(auction.starttime, auction.endtime)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(auction.starttime, auction.endtime));
      setStatus(getAuctionStatus(auction.starttime, auction.endtime));
    }, 1000);

    return () => clearInterval(interval);
  }, [auction.starttime, auction.endtime]);

  return (
    <div className="auction-count">
      <p className={`auction-timer ${status.color}`}>
        {status.text} - <span>{formatTime(timeLeft)}</span>
      </p>
    </div>
  );
};

// ✅ Bid History Component
const BidHistory = ({ bids }) => {
  if (!bids || bids.length === 0) {
    return <p className="bid-history">No bids yet.</p>;
  }

  return (
    <div className="bid-history">
      <h4>Bid History</h4>
      <ul>
        {bids.map((bid, index) => (
          <li key={index}>
            <span className="bid-amount">${bid.amount}</span> by <span className="bid-user">{bid.bidderName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
