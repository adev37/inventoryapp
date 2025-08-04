import Item from "../models/Item.js";

// ➕ Create item
export const createItem = async (req, res) => {
  try {
    const newItem = await Item.create(req.body);
    res
      .status(201)
      .json({ message: "Item created successfully", item: newItem });
  } catch (error) {
    // ✅ Handle duplicate modelNo for company
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This model number already exists for the selected company.",
      });
    }

    console.error("Error creating item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 📥 Get all items
export const getAllItems = async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Update item
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Item.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: "Item updated successfully", item: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update item" });
  }
};

// ❌ Delete item
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await Item.findByIdAndDelete(id);
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete item" });
  }
};
