const mongoose = require("mongoose");

const Commission = require("../models/commissionSchema");
const PaymentProof = require("../models/commissionProofSchema");
const User = require("../models/userSchema");
const Auction = require("../models/auctionSchema");

exports.deleteAuctionItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Auction ID is required" });
    }

    const auctionItem = await Auction.findById(id);
    if (!auctionItem) {
      return res.status(404).json({ message: "Auction item not found" });
    }

    await auctionItem.deleteOne();
    return res
      .status(200)
      .json({ message: "Auction item deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


exports.getAllPaymentProofs = async (req, res) => {
    try{

        let Proof = await PaymentProof.find();
        return res.status(200).json({ Proof });

    }catch(error){
        return res.status(500).json({ message: error.message });
    }
}



exports.getPaymentProofDetails = async (req, res) => {
    try{
        const { id } = req.params;
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({ message: "Invalid payment proof ID" });
        }
        if (!id) {
            return res.status(400).json({ message: "Payment proof ID is required" });
        }

        let Proof = await PaymentProof
            .findById(id);
        return res.status(200).json({ Proof });
            
    }
    catch(error){
        return res.status(500).json({ message: error.message });
    }
}


exports.updateProofStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {status} = req.body;
        if (!id) {
            return res.status(400).json({ message: "Payment proof ID is required" });
        }
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({ message: "Invalid payment proof ID" });
        }
        // console.log(status);
        
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }
       


        let Proof = await PaymentProof.findById(id);
        if (!Proof) {
            return res.status(404).json({ message: "Payment proof not found" });
        }

        Proof = await PaymentProof.findByIdAndUpdate(id, { status}, { new: true, runValidators: true, useFindAndModify: false });
        if(Proof.status === 'settled'){
            const user = await User.findById(Proof.userid);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            await User.findByIdAndUpdate(user._id, { $inc: { unpaidCommission: -Proof.amount } }, { new: true });
        }
        return res.status(200).json({ message: "Payment proof updated successfully", PaymentProof });

    } catch (error) {
      console.log(error);
      
        return res.status(500).json({ message: error.message });
    }
}


exports.deletePaymentProof = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Payment proof ID is required" });
        }
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({ message: "Invalid payment proof ID" });
        }

        let Proof = await PaymentProof.findById(id);
        if (!Proof) {
            return res.status(404).json({ message: "Payment proof not found" });
        }

        await Proof.deleteOne();
        return res.status(200).json({ message: "Payment proof deleted successfully" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

exports.fetchAllUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      { $match: { createdAt: { $exists: true, $ne: null } } }, // ✅ Use correct field name
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" }, // ✅ Use "createdAt" instead of "createdat"
            year: { $year: "$createdAt" },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          role: "$_id.role",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    console.log("Aggregated Users Data:", users); // ✅ Debugging output

    const bidders = users.filter((user) => user.role === "bidder");
    const auctioneers = users.filter((user) => user.role === "auctioneer");

    const transformDataToMonthlyArray = (data, totalMonths = 12) => {
      const result = Array(totalMonths).fill(0);
      data.forEach((item) => {
        if (item.month >= 1 && item.month <= 12) {
          result[item.month - 1] = item.count;
        }
      });
      return result;
    };

    const biddersArray = transformDataToMonthlyArray(bidders);
    const auctioneersArray = transformDataToMonthlyArray(auctioneers);

    res.status(200).json({
      success: true,
      biddersArray,
      auctioneersArray,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: error.message });
  }
};



exports.monthlyRevenue = async (req, res) => {
    const payments = await Commission.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdat" },
            year: { $year: "$createdat" },
          },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);
  
    const tranformDataToMonthlyArray = (payments, totalMonths = 12) => {
      const result = Array(totalMonths).fill(0);
  
      payments.forEach((payment) => {
        result[payment._id.month - 1] = payment.totalAmount;
      });
  
      return result;
    };
  
    const totalMonthlyRevenue = tranformDataToMonthlyArray(payments);
    res.status(200).json({
      success: true,
      totalMonthlyRevenue,
    });
  };