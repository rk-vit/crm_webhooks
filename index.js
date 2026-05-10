import express from "express";
import dotenv from "dotenv";
import handler99acres from "./api/webhooks/99acres.js";
import handlerExotel from "./api/webhooks/exotel.js";
import handlerHousing from "./api/webhooks/housing.js";
import handlerInstagram from "./api/webhooks/instagram.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/webhooks/99acres", handler99acres);
app.post("/api/webhooks/exotel", handlerExotel);
app.post("/api/webhooks/housing", handlerHousing);
app.post("/api/webhooks/instagram", handlerInstagram);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});