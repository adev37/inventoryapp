// controllers/locationController.js
import Location from "../models/Location.js";

// ➕ Create a new location
export const createLocation = async (req, res) => {
  try {
    const { name, warehouse, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Location name is required." });
    }

    // Get all warehouses
    const warehouses = await import("../models/Warehouse.js").then((mod) =>
      mod.default.find()
    );

    const createdLocations = [];

    for (const wh of warehouses) {
      const exists = await Location.findOne({
        name: { $regex: new RegExp("^" + name + "$", "i") },
        warehouse: wh._id,
      });

      if (!exists) {
        const loc = await Location.create({
          name,
          warehouse: wh._id,
          description,
        });
        createdLocations.push(loc);
      }
    }

    if (createdLocations.length === 0) {
      return res
        .status(400)
        .json({ message: "Location already exists in all warehouses." });
    }

    res.status(201).json({
      message: `✅ Location created in ${createdLocations.length} warehouse(s).`,
      locations: createdLocations,
    });
  } catch (error) {
    console.error("❌ Error in createLocation:", error);
    res.status(500).json({ message: "Failed to create location" });
  }
};
// 📄 Get all locations
export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find().populate("warehouse", "name");
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

// ✏️ Update a location
export const updateLocation = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ message: "Location name is required." });
    }

    const updated = await Location.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Location not found." });
    }

    res.json(updated);
  } catch (error) {
    console.error("❌ Error in updateLocation:", error);
    res.status(500).json({ message: "Failed to update location." });
  }
};

// ❌ Delete a location
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Location.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Location not found." });
    }

    res.json({ message: "Location deleted successfully." });
  } catch (error) {
    console.error("❌ Error in deleteLocation:", error);
    res.status(500).json({ message: "Failed to delete location." });
  }
};
