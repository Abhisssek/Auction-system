import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./SingleAuction.css";
import { io } from "socket.io-client";
import { getTimeRemaining, getAuctionStatus } from "../../../../utils/AuctionUtils";
import { Navbar } from "../../Navbar/Navbar";

const socket = io("http://localhost:3000");

export const SingleAuction = () => {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [timeLeft, setTimeLeft] = useState({});
  const [mainImage, setMainImage] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bids, setBids] = useState([]);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);

  // Fetch auction details
  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/v1/auction/${id}`);
        if (!res.ok) throw new Error(`HTTP Error! Status: ${res.status}`);
        const data = await res.json();
        
        setAuction(data.auctionItem);
        setMainImage(data.auctionItem.images?.[0]?.url || "/placeholder.jpg");
      } catch (error) {
        console.error("Error fetching auction:", error);
      }
    };
    fetchAuction();
  }, [id]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/v1/user/profile", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch profile");

        const userData = await response.json();
        setUserRole(userData.user.role);
        setUserId(userData.user._id);
      } catch (error) {
        console.error("Profile fetch error:", error.message);
      }
    };
    fetchProfile();
  }, []);

  // Real-time bid updates
  useEffect(() => {
    socket.emit("joinAuction", id);
    socket.on("bidUpdate", (newBids) => {
      setBids(newBids);
    });

    return () => {
      socket.off("bidUpdate");
    };
  }, [id]);

  // Auction countdown
  useEffect(() => {
    const interval = setInterval(() => {
      if (auction) {
        const remainingTime = getTimeRemaining(auction.startTime, auction.endTime);
        setTimeLeft(remainingTime);
        
        if (remainingTime.total <= 0) {
          setAuctionEnded(true);
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  // Place bid function
  const placeBid = () => {
    if (auctionEnded) {
      alert("Auction has ended. No more bids allowed.");
      return;
    }

    if (!bidAmount || isNaN(bidAmount) || parseFloat(bidAmount) <= auction.currentbid) {
      alert("Enter a valid higher bid!");
      return;
    }

    const newBid = {
      auctionId: id,
      amount: parseFloat(bidAmount),
      user: "Current User",
      timestamp: new Date().toLocaleString(),
    };

    socket.emit("placeBid", newBid);
    setBidAmount("");
  };

  if (!auction) return <h2>Loading Auction...</h2>;

  const { text, color } = getAuctionStatus(auction.startTime, auction.endTime);

  return (
    <>
      <Navbar />
      <div className="container-2">
        <div className="single-auction-container">
          {/* Left Section: Image Gallery */}
          <div className="image-gallery">
            <img className="main-image" src={mainImage} alt="Auction Item" />
            <div className="thumbnail-container">
              {auction.images?.map((image, index) => (
                <img
                  key={index}
                  className={`thumbnail ${mainImage === image.url ? "selected" : ""}`}
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  onClick={() => setMainImage(image.url)}
                />
              ))}
            </div>
          </div>

          {/* Right Section: Auction Details */}
          <div className="auction-details">
            <h1 className="auction-title">{auction.title}</h1>
            <p className="auction-description"><strong>Description:</strong> {auction.description}</p>
            <p className="auction-seller"><strong>Seller:</strong> {auction.sellername || "Unknown"}</p>
            <p className="item-info"><strong>Item condition:</strong> {auction.condition}</p>
            <p className="item-info"><strong>Starting price:</strong> ${auction.startingBid}</p>
            <p className="current-bid"><strong>Current bid:</strong> ${auction.currentbid}</p>
            <p className="auction-status"><strong>Status:</strong> <span style={{ color }}>{text}</span></p>
            <p className="item-info"><strong>Ending Time:</strong> {new Date(auction.endTime).toLocaleString()}</p>

            {/* Show "Auction Ended" when time is up */}
            {auctionEnded ? (
              <p className="auction-ended">🚨 Auction has ended. No more bids allowed.</p>
            ) : (
              <p className="timer">
                <strong>Time left:</strong> {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </p>
            )}

            {/* ✅ Only show bid input if the user is NOT the auctioneer */}
            {userRole === "bidder" ? (
              !auctionEnded && (
                <div className="bid-section">
                  <input
                    type="number"
                    className="bid-input"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter bid amount"
                  />
                  <button className="bid-button" onClick={placeBid}>
                    Place Bid
                  </button>
                </div>
              )
            ) : (
              <p className="auctioneer-info">You are the auctioneer. Bidding is not allowed.</p>
            )}

            {/* Real-time Bid History */}
            <div className="bid-history">
              <h3>Bid History</h3>
              <ul className="bid-list">
                {bids.length > 0 ? (
                  bids.map((bid, index) => (
                    <li key={index} className="bid-item">
                      <strong>{bid.user}:</strong> ${bid.amount}{" "}
                      <span className="bid-timestamp">({bid.timestamp})</span>
                    </li>
                  ))
                ) : (
                  <p>No bids yet.</p>
                )}
              </ul>
            </div>

            {/* Bidding Rules */}
            <div className="bidding-rules">
              <h3>Bidding Rules:</h3>
              <ul>
                <li>The bid amount must be higher than the current highest bid.</li>
                <li>Bids are final and cannot be withdrawn.</li>
                <li>Ensure that your payment method is valid before bidding.</li>
                <li>The highest bidder at the end of the auction wins.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
