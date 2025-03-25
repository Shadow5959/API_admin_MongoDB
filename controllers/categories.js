const {Type, Category, Subcategory} = require('../database.js');
const mongoose = require('mongoose');
const { AppError } = require('../utils/errorHandler');


const categories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isDeleted: false });
    if (!categories.length) {
      return next(new AppError("No categories found", 404));
    }
    return res.status(200).json(categories);
  } catch (error) {
    return next(new AppError("Database error while fetching categories", 500));
  }
};

const addCategory = async (req, res, next) => {
  try {
    const { category } = req.body;
    if (!category) {
      return next(new AppError("Category is required", 400));
    }
    const newCategory = new Category({ name: category });
    await newCategory.save();
    return res.status(201).json(newCategory);
  } catch (error) {
    return next(new AppError("Database error while adding category", 500));
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.query;
    const { category } = req.body;
    if (!id) {
      return next(new AppError("Category ID is required", 400));
    }
    const updatedCategory = await Category.findByIdAndUpdate(id
      , { name: category }
      , { new: true });
    if (!updatedCategory) {
      return next(new AppError("Category not found", 404));
    }
    return res.status(200).json(updatedCategory); 
  } catch (error) {
    return next(new AppError("Database error while updating category", 500));
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return next(new AppError("Category ID is required", 400));
    }
    const category = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!category) {
      return next(new AppError("Category not found", 404));
    }
    return res.status(200).json({message: "Category deleted successfully"});
  } catch (error) {
    return next(new AppError("Database error while deleting category", 500));
  }
};

const subcategory = async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return next(new AppError("Category ID is required", 400));
    }
    const subcategories = await Subcategory.find({ isDeleted: false, category: id });
    if (!subcategories.length) {
      return next(new AppError("No subcategories found", 404));
    }
    return res.status(200).json(subcategories);
  } catch (error) {
    return next(new AppError("Database error while fetching subcategories", 500));
  }
};

const addSubcategory = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const { subcategory } = req.body;
    console.log("Data received in subcategory:", categoryId, subcategory);
    
    if (!categoryId || !subcategory) {
      return next(new AppError("Category ID and Subcategory are required", 400));
    }
    
    // Create a new ObjectId for the subcategory
    const subcategoryId = new mongoose.Types.ObjectId();

    // Update the category document by pushing the new subcategory
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryId, isDeleted: false },
      { $push: { subcategories: { _id: subcategoryId, name: subcategory } } },
      { new: true }
    );
    
    if (!updatedCategory) {
      return next(new AppError("Category not found", 404));
    }
    
    return res.status(201).json(updatedCategory);
  } catch (error) {
    return next(new AppError("Database error while adding subcategory", 500));
  }
};


const updateSubcategory = async (req, res, next) => {
  try {
    const { id } = req.query; // id of the subcategory
    const { subcategory, category } = req.body; // new name and optional new parent category id

    if (!id) {
      return next(new AppError("Subcategory ID is required", 400));
    }

    // Lazy load the Category model to avoid circular dependency
    const Category = require('../database.js').Category;

    // Find the Category document that contains this subcategory
    const parentCategory = await Category.findOne({
      "subcategories._id": id,
      isDeleted: false
    });
    if (!parentCategory) {
      return next(new AppError("Subcategory not found", 404));
    }

    // If a new parent category is provided and is different from the current one,
    // reassign the subcategory.
    if (category && category !== parentCategory._id.toString()) {
      const newParentCategory = await Category.findOne({
        _id: category,
        isDeleted: false
      });
      if (!newParentCategory) {
        return next(new AppError("New category not found", 404));
      }

      // Get the subdocument
      let subcat = parentCategory.subcategories.id(id);
      if (!subcat) {
        return next(new AppError("Subcategory not found in parent", 404));
      }

      // Update the subcategory's name if provided.
      if (subcategory) {
        subcat.name = subcategory;
      }

      // IMPORTANT: update the categoryId field to point to the new parent.
      subcat.categoryId = newParentCategory._id;

      // Remove the subcategory from the current parent using pull.
      parentCategory.subcategories.pull(subcat._id);
      await parentCategory.save();

      // Push the updated subcategory into the new parent's subcategories array.
      newParentCategory.subcategories.push(subcat.toObject());
      await newParentCategory.save();

      return res.status(200).json({
        message: "Subcategory reassigned to new category successfully",
        updatedSubcategory: subcat,
        newParentCategory
      });
    } else {
      // Otherwise, update the subcategory's name within its current parent.
      if (!subcategory) {
        return next(new AppError("No update provided for subcategory", 400));
      }

      const updatedCategory = await Category.findOneAndUpdate(
        { "subcategories._id": id },
        { $set: { "subcategories.$.name": subcategory } },
        { new: true }
      );
      if (!updatedCategory) {
        return next(new AppError("Subcategory update failed", 500));
      }

      const updatedSub = updatedCategory.subcategories.id(id);
      return res.status(200).json({
        message: "Subcategory updated successfully",
        updatedSubcategory: updatedSub
      });
    }
  } catch (error) {
    console.error("Error updating subcategory:", error);
    return next(new AppError("Database error while updating subcategory", 500));
  }
};




const deleteSubcategory = async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return next(new AppError("Subcategory ID is required", 400));
    }

    // Find the category containing the subcategory
    const category = await Category.findOneAndUpdate(
      { "subcategories._id": id },
      { $set: { "subcategories.$.isDeleted": true } },
      { new: true }
    );

    if (!category) {
      return next(new AppError("Subcategory not found", 404));
    }

    return res.status(200).json({ message: "Subcategory deleted successfully", id });
  } catch (error) {
    return next(new AppError("Database error while deleting subcategory", 500));
  }
};

const types = async (req, res, next) => {
  try {
    const types = await Type.find({ isDeleted: false });
    if (!types.length) {
      return next(new AppError("No types found", 404));
    }
    return res.status(200).json(types);
  } catch (error) {
    return next(new AppError("Database error while fetching types", 500));
  }
};

module.exports = { 
  categories, 
  addCategory, 
  deleteCategory, 
  updateCategory,
  subcategory, 
  addSubcategory, 
  updateSubcategory, 
  deleteSubcategory, 
  types 
};