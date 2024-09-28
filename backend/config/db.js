const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://prachiheda:9mW8VggtfL2VlCJ5@cluster0.ae54q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    console.log("MongoDB Atlas connected...");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;