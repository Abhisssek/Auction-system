const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    startingprice: { type: Number, required: true },
    category: { type: String, required: true },
    condition: {
        type: String,
        enum: ['new', 'used'],
        required: true
    },
    currentbid: { type: Number, default: 0 },
    starttime: { type: String, required: true },
    endtime: { type: String, required: true },
    image: {
        public_id: { type: String, required: true },
        url: { type: String, required: true }
    },
    createdby: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bids: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number, required: true },
        time: { type: Date, default: () => new Date() }
    }],
    highestbidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    commissioncalculated: { type: Boolean, default: false },
    createdat: { type: Date, default: () => new Date() }
});

// Add indexes for faster querying
auctionSchema.index({ starttime: 1 });
auctionSchema.index({ endtime: 1 });

module.exports = mongoose.model('Auction', auctionSchema);
