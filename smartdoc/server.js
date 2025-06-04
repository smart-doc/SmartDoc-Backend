require("dotenv").config();
const express = require("express");
const connectDB = require("./config/index.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// const cloudinary = require("cloudinary").v2
// const path = require("path");
const app = express();
const bodyParser = require("body-parser")
// const seedRoles = require('./controllers/roleController.js');
const { FileUtility } = require('./utils/fileUtility.js');


app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
// app.use(express.static(path.join(__dirname, "views")));
app.use(cookieParser());

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:5173'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
// app.use('/api/chat', limiter);

app.use(compression())
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ limit: "20mb", extended: true }));


app.get('/', (req, res) => {
  res.send('Welcome to SmartDoc, healthcare of the future');
});


// Routes
const authRoutes = require("./routes/authRoutes.js");
const userProfileRoutes = require("./routes/userProfileRoute.js");
const chatSessionRoutes = require('./routes/chatSessionRoute.js');
// const webhookRoutes = require('./routes/webhookRoutes.js')
// const ReminderService = require('./services/reminderService.js')

// const paymentRoutes = require("../routes/paymentRoute.js");

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userProfileRoutes);
app.use('/api/v1/chat', limiter, chatSessionRoutes);
// app.use('/api/v1/webhook', webhookRoutes)
app.use('/uploads', express.static('uploads'));

// const reminderService = new ReminderService();
// reminderService.startReminderSystem()


(async () => {
  await FileUtility.ensureDirectoryExists('uploads/audio');
  await FileUtility.ensureDirectoryExists('uploads/images');
})();


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost: ${PORT}`);
  connectDB();
});