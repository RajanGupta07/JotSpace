import multer, { diskStorage } from "multer";
import path from "path";
import crypto from "crypto";

// Set up storage configuration for multer
const storage = diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/uploads"); // Directory where files will be stored
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, buffer) => {
      if (err) {
        return cb(err);
      }
      // Create a unique filename using the original name and a random string
      const uniqueName =
        buffer.toString("hex") + path.extname(file.originalname);
      cb(null, uniqueName); // Pass the unique filename to the callback
    });
  },
});

// Create the multer instance with the storage configuration
const upload = multer({ storage: storage });

// Export the upload instance for use in other parts of the application
export default upload;
