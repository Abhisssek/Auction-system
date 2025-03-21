import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./MyAuction.css";
import { Navbar } from "../../Navbar/Navbar";
import {
  getTimeRemaining,
  getAuctionStatus,
  formatTime,
} from "../../../../utils/AuctionUtils";

// Initialize Socket.io connection
const socket = io("http://localhost:3000");

export const MyAuctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAuctions();
    fetchProfile();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/auction/myauctions",
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch auctions");
      }

      const data = await response.json();
      data.sort((a, b) => new Date(b.starttime) - new Date(a.starttime));

      const updatedData = data.map((auction) => ({
        ...auction,
        currentbid: auction.currentbid ?? auction.startingprice,
      }));

      setAuctions(updatedData);
    } catch (error) {
      console.error("Error fetching auctions:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/v1/user/profile", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const datas = await response.json();
      setUserRole(datas.user.role);
      setUserId(datas.user._id);
    } catch (error) {
      console.error("Profile fetch error:", error.message);
    }
  };

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

  const deleteAuction = async (auctionId) => {
    console.log(auctionId);

    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/auction/delete/${auctionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete auction");
      }

      setAuctions((prevAuctions) =>
        prevAuctions.filter((auction) => auction._id !== auctionId)
      );

      toast.success("Auction deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });

    } catch (error) {
      console.error("Error deleting auction:", error);
      toast.error("Failed to delete auction!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
    }
  };

  return (
    <div className="auctions-container">
      <Navbar />
      <h2>My Auctions</h2>
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

              {userRole === "auctioneer" && userId === auction.createdby && (
                <div className="auction-btns">
                  <button onClick={() => deleteAuction(auction._id)} className="delete-btn secondary-btn">
                    Delete Auction
                  </button>
                  {new Date() > new Date(auction.endtime) && (
                    <button onClick={() => navigate(`/republish/${auction._id}`)} className="republish-btn primary-btn">
                      Republish Auction
                    </button>
                  )}
                </div>
              )}

              {userRole === "bidder" && (
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
