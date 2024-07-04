const mongoose = require("mongoose");
const { Schema } = mongoose;
const PostSchema = new mongoose.Schema({
    title:String,
    summary:String,
    content:String,
    cover:String,
    author:{type:Schema.Types.ObjectId, ref:'users'},

},{
    timestamps:true,
});

module.exports =  mongoose.model("Post",PostSchema); 