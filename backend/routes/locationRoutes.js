import express from "express";
import {
  createLocation,
  getAllLocations,
  updateLocationsByName,
  deleteLocation, // ✅ Add this
} from "../controllers/locationController.js";

const router = express.Router();

router.post("/", createLocation);
router.get("/", getAllLocations);
router.delete("/:id", deleteLocation); // ✅ Make sure this line exists
router.put("/by-name/:name", updateLocationsByName); // 👈 New route
export default router;
