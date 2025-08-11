import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  age: Number,
  profilepic: {
    type: String,
    default: "default.jpg", // ✅ instead of "public/images/uploads/default.jpg"
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
