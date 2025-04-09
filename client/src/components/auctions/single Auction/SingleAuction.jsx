import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  getTimeRemaining,
  getAuctionStatus,
  formatTime,
} from "../../../../utils/AuctionUtils";
import { Navbar } from "../../Navbar/Navbar";
import "./SingleAuction.css";

const socket = io("http://localhost:3000");

export const SingleAuction = () => {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [status, setStatus] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null); // ✅ Add this near other useState hooks



  // ✅ Fetch auction details
  const refetchAuction = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/auction/${id}`);
      if (!res.ok) throw new Error(`HTTP Error! Status: ${res.status}`);
      const data = await res.json();

      // console.log("Fetched auction data:", data.auctionItem);

      if (data.auctionItem) {
        setAuction(data.auctionItem);
        setMainImage(data.auctionItem.images?.[0]?.url || "/placeholder.jpg");
      } else {
        console.error("auctionItem not found in response");
      }
    } catch (error) {
      console.error("Error fetching auction:", error);
    }
  };

  useEffect(() => {
    refetchAuction();
  }, [id]);

  useEffect(() => {
    if (auction) {
      setTimeLeft(getTimeRemaining(auction.starttime, auction.endtime));
      setStatus(getAuctionStatus(auction.starttime, auction.endtime));
    }
  }, [auction]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/v1/user/profile",
          {
            method: "GET",
            credentials: "include",
          }
        );

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

  useEffect(() => {
    if (!auction) return;

    socket.emit("joinAuction", id);

    socket.on("updateBid", (bidData) => {
      if (bidData.auctionId === auction._id) {
        setAuction((prevAuction) => ({
          ...prevAuction,
          currentbid: bidData.currentbid,
          highestbidder: bidData.highestbidder,
          bids: bidData.auctionBids,
        }));
      }
    });

    return () => {
      socket.off("updateBid");
    };
  }, [id, auction]);

  useEffect(() => {
    if (!auction) return;

    const interval = setInterval(() => {
      const remainingTime = getTimeRemaining(
        auction?.starttime,
        auction?.endtime
      );
      setTimeLeft(remainingTime);
      setStatus(getAuctionStatus(auction?.starttime, auction?.endtime));

      if (remainingTime?.total <= 0) {
        clearInterval(interval);
        setAuctionEnded(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  // ✅ Updated place bid function (no reload)
  const placeBid = async () => {
    if (auctionEnded) {
      alert("Auction has ended. No more bids allowed.");
      return;
    }

    const bidValue = parseFloat(bidAmount);
    if (
      !bidValue ||
      isNaN(bidValue) ||
      bidValue <= auction?.currentbid ||
      bidValue <= 0 ||
      bidValue < auction?.startingprice
    ) {
      alert("Enter a valid higher bid!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/api/v1/bid/place/${auction._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ amount: bidValue }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to place bid");
      }

      setBidAmount("");
      await refetchAuction(); // ✅ Refresh manually
      setLoading(false);
    } catch (error) {
      setLoading(false);
      alert(error.message);
      console.error("Bid placement error:", error);
    }
  };


  useEffect(() => {
    if (!auction) return;
  
    const interval = setInterval(async () => {
      const remainingTime = getTimeRemaining(
        auction.starttime,
        auction.endtime
      );
      setTimeLeft(remainingTime);
      setStatus(getAuctionStatus(auction.starttime, auction.endtime));
      // console.log("Fetching auction data after end...", remainingTime);
  
      if (remainingTime <= 0) {
        clearInterval(interval);
        setAuctionEnded(true);

        
  
        try {
          const res = await fetch(`http://localhost:3000/api/v1/auction/${id}`);
          const data = await res.json();
          const updatedAuction = data.auctionItem;
  
          if (updatedAuction) {
            setAuction(updatedAuction);
  
            if (updatedAuction.bids?.length > 0) {
              const topBid = updatedAuction.bids.reduce((prev, curr) =>
                Number(curr.amount) > Number(prev.amount) ? curr : prev
              );
              setWinner(topBid.biddername || "Anonymous");
            } else {
              setWinner(null);
            }
          }
        } catch (error) {
          console.error("Failed to refetch auction after end:", error);
        }
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [id, auction?.starttime, auction?.endtime]);
  
 
  // const highestBid = Math.max(...auction.bids.map(bid => Number(bid.amount)));
  const highestBid = auction?.bids?.length
    ? Math.max(...auction.bids.map((bid) => Number(bid.amount)))
    : auction?.startingprice || 0; // Default to starting price if no bids

  // console.log("Highest bid:", highestBid);

  if (!auction) return <h2>Loading Auction...</h2>;

  return (
    <div className="single-auction">
      <Navbar />
      <div className="container-2">
        <div className="single-auction-container">
          {/* Left Section */}
          <div className="image-gallery">
            <img className="main-image" src={mainImage} alt="Auction Item" />
            <div className="thumbnail-container">
              {auction.images?.map((image, index) => (
                <img
                  key={index}
                  className={`thumbnail ${
                    mainImage === image.url ? "selected" : ""
                  }`}
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  onClick={() => setMainImage(image.url)}
                />
              ))}
            </div>
          </div>

          {/* Right Section */}
          <div className="auction-details">
            <h1 className="auction-title">{auction.title}</h1>
            <p className="auction-description">
              <strong>Description:</strong> {auction.description}
            </p>
            <p className="auction-seller">
              <strong>Created By:</strong> {auction.artcreater || "Unknown"}
            </p>
            <p className="item-info">
              <strong>Item condition:</strong> {auction.condition}
            </p>
            <p className="item-info">
              <strong>Starting price:</strong> ${auction.startingprice}
            </p>
            <p className="current-bid">
              <strong>Current bid:</strong> ${auction.currentbid}
            </p>
            <p className="auction-status">
              <strong>Status:</strong>{" "}
              <span style={{ color: status?.color }}>{status?.text}</span>
            </p>
            <p className="item-info">
              <strong>Ending Time:</strong>{" "}
              {new Date(auction.endtime).toLocaleString()}
            </p>

            {auctionEnded ? (
              <div className="auction-ended">
                🚨 Auction has ended. No more bids allowed.
                {winner && (
                  <div className="winner-announcement">
                    🏆 <strong>{winner}</strong> has won this auction!
                  </div>
                )}
              </div>
            ) : (
              <AuctionCountdown auction={auction} />
            )}

            {userRole === "bidder" && !auctionEnded && (
              <div className="bid-section">
                <input
                  type="number"
                  className="bid-input"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount"
                  disabled={loading}
                />
                <button
                  className="bid-button"
                  onClick={placeBid}
                  disabled={loading}
                >
                  {loading ? <span className="loader"></span> : "Place Bid"}
                </button>
              </div>
            )}

            <div className="bid-history">
              <h3>Bid History</h3>
              <ul className="bid-list">
                {auction.bids?.length > 0 ? (
                  auction.bids.map((bid, index) => {
                    const isTopBid = Number(bid.amount) === highestBid; // Compare against correct highest bid
                    return (
                      <li key={index} className="bid-item">
                        <strong
                          style={{
                            color: isTopBid ? "green" : "inherit",
                          }}
                        >
                          {bid.biddername || "Anonymous"}:
                        </strong>{" "}
                        ${bid.amount}{" "}
                        <span className="bid-timestamp">
                          ({new Date(bid.time).toLocaleString()})
                        </span>
                      </li>
                    );
                  })
                ) : (
                  <p>No bids yet.</p>
                )}
              </ul>
            </div>

            <div className="bidding-rules">
              <h3>Bidding Rules:</h3>
              <ul>
                <li>
                  The bid amount must be higher than the current highest bid.
                </li>
                <li>Bids are final and cannot be withdrawn.</li>
                <li>
                  Ensure that your payment method is valid before bidding.
                </li>
                <li>The highest bidder at the end of the auction wins.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
