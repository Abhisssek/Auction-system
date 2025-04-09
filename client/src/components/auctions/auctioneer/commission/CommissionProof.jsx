import React, { useEffect, useState } from "react";
import { Navbar } from "../../../Navbar/Navbar";
import "./CommissionProof.css";

export const CommissionProof = () => {
  const [user, setUser] = useState({});
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [proofStatus, setProofStatus] = useState("");
  const [allProofs, setAllProofs] = useState([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/v1/user/profile", {
          credentials: "include",
        });

        const data = await res.json();
        console.log(data);

        setUser(data.user);
        setAmount(data.user.unpaidCommission);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };

    fetchUserProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!proof || !amount) {
      alert("Please fill in all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("proof", proof);
    formData.append("amount", amount);
    formData.append("comment", comment);

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3000/api/v1/commission/proof", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await res.json();

      if (res.ok) {
        // alert("Proof submitted successfully!");
        setAmount("");
        setComment("");
        setProof(null);
        window.location.reload();
      } else {
        alert(result.message || "Failed to submit proof");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred while submitting the proof.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProofStatus = async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/api/v1/commission/my-proof",
          {
            credentials: "include",
          }
        );

        const data = await res.json();
        console.log(data);

        const proofs = data.commissionProofs;
        setAllProofs(proofs[proofs.length - 1]);

        if (!proofs || proofs.length === 0) {
          console.log("No proofs found.");
          return;
        }

        // Get the latest proof - assuming the latest one is the last one
        const latestProof = proofs[proofs.length - 1];

        switch (latestProof.status) {
          case "pending":
            setIsSubmitted(true);
            setProofStatus("pending");
            break;
          case "approved":
            setIsSubmitted(true);
            setProofStatus("approved");
            break;
          case "rejected":
            setIsSubmitted(false);
            setProofStatus("rejected");
            break;
          case "settled":
            setIsSubmitted(false);
            setProofStatus("settled");
            break;
          default:
            console.log("Unknown proof status:", latestProof.status);
        }
      } catch (err) {
        console.error("Failed to fetch proof status:", err);
      }
    };

    fetchProofStatus();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container commission-proof-container">
        {/* <Navbar /> */}
        <>
          {proofStatus === "settled" ? (
            <div className="commission-settled">
              <p style={{ color: "green", fontSize: "35px" }}>
                Your proof has been settled.
              </p>
            </div>
          ) : null}

          {proofStatus === "rejected" ? (
            <div className="commission-rejected">
              <p style={{ color: "red", fontSize: "35px" }}>
                Your proof has been rejected.
              </p>
            </div>
          ) : null}
          <div className="auctioneer-commission-proof">
            <h2 className="commission-title">Auctioneer Commission Proof</h2>

            <div className="commission-user-info">
              <p>
                <strong>Name:</strong> {user.profilename}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
            </div>

            {isSubmitted ? (
              <div className="commission-success">
                ✅ Payment proof has been submitted. It is currently under
                review. Yor payment Proof Status is{" "}
                <span style={{ color: "yellow" }}>{proofStatus}</span>
              </div>
            ) : (
              <>
              <div>
                <form
                  className="commission-form"
                  onSubmit={handleSubmit}
                  encType="multipart/form-data"
                >
                  <div>
                    <label>Amount (in $):</label>
                    <br />
                    <input
                      className="auctioneer-commission-input"
                      type="number"
                      value={amount}
                      readOnly
                      required
                    />
                  </div>

                  <div>
                    <label>Comment (optional):</label>
                    <br />
                    <textarea
                      className="auctioneer-commission-input"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Upload Proof (image):</label>
                    <br />
                    <input
                      className="auctioneer-commission-input form-control"
                      style={{ padding: "5px" }}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setProof(e.target.files[0])}
                    />
                  </div>

                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "loader" : "Submit Proof"}
                  </button>
                </form>
              </div>
              <div style={{ marginTop: "40px" }}>
            <h3 style={{ color: "white" }}>All Submitted Proofs</h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              {allProofs.map((proof, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid gray",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor: "#1c1c1c",
                    color: "white",
                  }}
                >
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {new Date(proof.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>Amount:</strong> ${proof.amount}
                  </p>
                  <p>
                    <strong>Comment:</strong> {proof.comment || "—"}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        color:
                          proof.status === "pending" ||
                          proof.status === "approved"
                            ? "yellow"
                            : proof.status === "rejected"
                            ? "red"
                            : "lightgreen",
                        fontWeight: "bold",
                      }}
                    >
                      {proof.status.toUpperCase()}
                    </span>
                  </p>
                  {proof.image && (
                    <img
                      src={`http://localhost:3000/uploads/${proof.image}`}
                      alt="proof"
                      style={{
                        maxWidth: "100px",
                        maxHeight: "100px",
                        marginTop: "5px",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
              </>
            )}
          </div>

          
        </>
      </div>
    </>
  );
};
