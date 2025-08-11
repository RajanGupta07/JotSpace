import express from "express";
import bcrypt from "bcrypt";
import PostModel from "./models/post.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import UserModel from "./models/user.js";
import path from "path";
import { fileURLToPath } from "url"; // ✅ add this
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));
import multer from "multer";

import upload from "./config/multerconfig.js";

// Correctly define __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.get("/profile/upload", (req, res) => {
  res.render("profileupload");
});

app.get("/login", async (req, res) => {
  res.render("login", { title: "Login" });
});

app.post("/upload", isloggedIn, upload.single("image"), async (req, res) => {
  let user = await UserModel.findOne({ email: req.user.email });
  if (!user) {
    return res.status(404).send("User not found");
  }

  // Update the user's profile picture
  user.profilepic = req.file.filename; // Use the filename from multer
  await user.save();

  res.redirect("/Profile"); // Redirect to profile after upload
});

app.get("/Profile", isloggedIn, async (req, res) => {
  const user = await UserModel.findById(req.user.userid).populate("posts");

  res.render("profile", { title: "Profile", user });
});

app.get("/like/:id", isloggedIn, async (req, res) => {
  let post = await PostModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.userid) !== -1) {
    // Unlike
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    await post.save();
  } else {
    // Like
    post.likes.push(req.user.userid);
    await post.save();
  }

  res.redirect("/Profile"); // Redirect back to profile after like/unlike
});

app.post("/post", isloggedIn, async (req, res) => {
  let user = await UserModel.findById(req.user.userid);
  if (!user) {
    return res.status(404).redirect("/login"); // Redirect to login if user not found
  }
  let { content } = req.body;

  let post = await PostModel.create({
    user: user._id,
    content,
  });
  user.posts.push(post._id);
  await user.save();

  res.status(201).redirect("/Profile"); // Redirect to profile page after creating post
});

app.post("/register", async (req, res) => {
  const { username, name, email, password, age } = req.body;
  // Validate input
  let user = await UserModel.findOne({ email });
  if (user) {
    return res.status(400).send("User already exists");
  }

  bcrypt.genSalt(10, async (err, salt) => {
    if (err) {
      return res.status(500).send("Error generating salt");
    }
    // Hash the password
    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) {
        return res.status(500).send("Error hashing password");
      }
      let user = await UserModel.create({
        username,
        name,
        email,
        password: hash,
        age,
      });

      let token = jwt.sign(
        { email, userid: user._id },
        process.env.JWT_SECRET,
        {}
      );

      res.cookie("token", token, { httpOnly: true });
      // res.send("User registered successfully");
      // await user.save();
      res.status(201).render("register", {
        title: "Register",
        message: "User registered successfully",
      });
    });
  });
});

app.get("/Edit/:id", async (req, res) => {
  let post = await PostModel.findOne({ _id: req.params.id }).populate("user");
  if (!post) {
    return res.status(404).send("Post not found");
  }
  res.render("Edit", { post }); // Pass the post object to the template
});

app.post("/update/:id", async (req, res) => {
  let post = await PostModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );
  res.redirect("/Profile");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // find the user by email
  let user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(400).send("Invalid email or password");
  }
  // check if the password matches
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) {
      return res.status(500).send("Error comparing passwords");
    }
    if (!isMatch) {
      return res.redirect("/login");
    }

    let token = jwt.sign(
      { email, userid: user._id },
      process.env.JWT_SECRET,
      {}
    );

    res.cookie("token", token, { httpOnly: true });
    res.status(200).redirect("/Profile"); // Redirect to home page if getting user data
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token"); // Clear the cookie
  res.redirect("/login");
});

function isloggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect("/login");
  }
  let decoded = jwt.verify(token, "secretkey");
  if (!decoded) {
    return res.redirect("/login");
  }
  req.user = decoded;
  next();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
