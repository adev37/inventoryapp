import express from "express";
import {
  createLocation,
  getAllLocations,
  updateLocation,
  deleteLocation, // ✅ Add this
} from "../controllers/locationController.js";

const router = express.Router();

router.post("/", createLocation);
router.get("/", getAllLocations);
router.put("/:id", updateLocation);
router.delete("/:id", deleteLocation); // ✅ Make sure this line exists

export default router;
