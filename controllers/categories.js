const db = require('../database.js');
const { AppError } = require('../utils/errorHandler');

const categories = async (req, res, next) => {
  db.query('SELECT * FROM jeweltest.category', (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching categories", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No categories found", 404));
    }
    return res.status(200).json(results);
  });
};

const addCategory = async (req, res, next) => {
  const { category } = req.body;
  console.log(`received data category: ${category}`);
  if (!category) {
    return next(new AppError("Category is required", 400));
  }
  db.query(`SELECT * FROM jeweltest.category WHERE cat_name = ?`, [category], (err, results) => {
    if (err) {
      return next(new AppError("Database error while checking category", 500));
    }
    if (results.length > 0) {
      return next(new AppError("Category already exists", 409));
    }
    db.query('INSERT INTO category SET ?', { cat_name: category }, (err, results) => {
      if (err) {
        return next(new AppError("Database error while adding category", 500));
      }
      return res.status(200).json({ category });
    });
  });
};

const deleteCategory = async (req, res, next) => {
  const { id, name } = req.query;
  console.log(`received id: ${id}, name: ${name}`);
  if (!id) {
    return next(new AppError("Category id is required", 400));
  }
  const query = `UPDATE jeweltest.category SET category_active = 0 WHERE cat_id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while deleting category", 500));
    }
    return res.status(200).json({ id, name });
  });
};

const subcategory = async (req, res, next) => {
  db.query('SELECT * FROM jeweltest.subcategory', (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching subcategories", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No subcategories found", 404));
    }
    return res.status(200).json(results);
  });
};

const addSubcategory = async (req, res, next) => {
  const { subcategory, category } = req.body;
  console.log(`received data subcategory: ${subcategory}, category: ${category}`);
  if (!subcategory || !category) {
    return next(new AppError("Subcategory and category are required", 400));
  }
  db.query(`INSERT into subcategory SET ?`, { subcategory_name: subcategory, cat_id: category }, (err, results) => {
    if (err) {
      return next(new AppError("Database error while adding subcategory", 500));
    }
    return res.status(200).json({ subcategory, category });
  });
};

const updateSubcategory = async (req, res, next) => {
  const { id } = req.query;
  const { subcategory, category } = req.body;
  console.log(`received data id: ${id}, subcategory: ${subcategory}, category: ${category}`);
  if (!id) {
    return next(new AppError("Subcategory id is required", 400));
  }
  db.query('SELECT subcategory_name, cat_id FROM jeweltest.subcategory WHERE subcategory_id = ?', [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching subcategory", 500));
    }
    if (results.length === 0) {
      return next(new AppError("Subcategory not found", 404));
    }
    const oldSubcategory = results[0].subcategory_name;
    const updatedSubcategory = subcategory || oldSubcategory;
    const oldCategory = results[0].cat_id;
    const updatedCategory = category || oldCategory;

    db.query('UPDATE subcategory SET subcategory_name = ?, cat_id = ? WHERE subcategory_id = ?', [updatedSubcategory, updatedCategory, id], (err, results) => {
      if (err) {
        return next(new AppError("Database error while updating subcategory", 500));
      }
      return res.status(200).json({ id, subcategory: updatedSubcategory, updatedCategory });
    });
  });
};

const deleteSubcategory = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Subcategory id is required", 400));
  }
  const query = `UPDATE jeweltest.subcategory SET subcategory_active = 0 WHERE subcategory_id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while deleting subcategory", 500));
    }
    return res.status(200).json({ id });
  });
};

const types = async (req, res, next) => {
  db.query('SELECT * FROM jeweltest.producttype', (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching product types", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No product types found", 404));
    }
    return res.status(200).json(results);
  });
};

module.exports = { categories, addCategory, deleteCategory, subcategory, addSubcategory, updateSubcategory, deleteSubcategory, types };
