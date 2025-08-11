// app.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";

import PostModel from "./models/post.js";
import UserModel from "./models/user.js";
import upload from "./config/multerconfig.js";

dotenv.config();

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Fix for __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Home route
app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

// ✅ Profile picture upload page
app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

// ✅ Login page
app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

// ✅ Upload profile picture
app.post("/upload", isloggedIn, upload.single("image"), async (req, res) => {
  try {
    let user = await UserModel.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");

    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/Profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Profile page
app.get("/Profile", isloggedIn, async (req, res) => {
  const user = await UserModel.findById(req.user.userid).populate("posts");
  res.render("profile", { title: "Profile", user });
});

// ✅ Like / Unlike a post
app.get("/like/:id", isloggedIn, async (req, res) => {
  let post = await PostModel.findById(req.params.id).populate("user");
  if (!post) return res.status(404).send("Post not found");

  const userIndex = post.likes.indexOf(req.user.userid);
  if (userIndex !== -1) {
    post.likes.splice(userIndex, 1); // Unlike
  } else {
    post.likes.push(req.user.userid); // Like
  }
  await post.save();
  res.redirect("/Profile");
});

// ✅ Create a new post
app.post("/post", isloggedIn, async (req, res) => {
  let user = await UserModel.findById(req.user.userid);
  if (!user) return res.status(404).redirect("/login");

  const { content } = req.body;
  let post = await PostModel.create({ user: user._id, content });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/Profile");
});

// ✅ Register new user
app.post("/register", async (req, res) => {
  const { username, name, email, password, age } = req.body;
  let existingUser = await UserModel.findOne({ email });
  if (existingUser) return res.status(400).send("User already exists");

  try {
    const hash = await bcrypt.hash(password, 10);
    let user = await UserModel.create({
      username,
      name,
      email,
      password: hash,
      age,
    });

    let token = jwt.sign({ email, userid: user._id }, process.env.JWT_SECRET);
    res.cookie("token", token, { httpOnly: true });
    res.render("register", {
      title: "Register",
      message: "User registered successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Edit post page
app.get("/Edit/:id", async (req, res) => {
  let post = await PostModel.findById(req.params.id).populate("user");
  if (!post) return res.status(404).send("Post not found");
  res.render("Edit", { post });
});

// ✅ Update post
app.post("/update/:id", async (req, res) => {
  await PostModel.findByIdAndUpdate(req.params.id, {
    content: req.body.content,
  });
  res.redirect("/Profile");
});

// ✅ Login user
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await UserModel.findOne({ email });
  if (!user) return res.status(400).send("Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.redirect("/login");

  let token = jwt.sign({ email, userid: user._id }, process.env.JWT_SECRET);
  res.cookie("token", token, { httpOnly: true });
  res.redirect("/Profile");
});

// ✅ Logout user
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// ✅ Middleware for authentication
function isloggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    let decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect("/login");
  }
}

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
