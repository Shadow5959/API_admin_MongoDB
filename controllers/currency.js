const db = require('../database.js');
const { AppError } = require('../utils/errorHandler');

const addCurrency = async (req, res, next) => {
  const { currency } = req.body;
  console.log(`received data currency: ${currency}`);
  if (!currency) {
    return next(new AppError("Currency is required", 400));
  }
  db.query(`SELECT * FROM jeweltest.currency WHERE cur_name = ?`, [currency], (err, results) => {
    if (err) {
      return next(new AppError("Database error while checking currency", 500));
    }
    if (results.length > 0) {
      return next(new AppError("Currency already exists", 409));
    }
    db.query('INSERT INTO currency SET ?', { cur_name: currency }, (err, results) => {
      if (err) {
        return next(new AppError("Database error while adding currency", 500));
      }
      return res.status(200).json({ currency });
    });
  });
};

const currency = async (req, res, next) => {
  db.query('SELECT * FROM jeweltest.currency', (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching currencies", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No currencies found", 404));
    }
    return res.status(200).json(results);
  });
};

const updateCurrency = async (req, res, next) => {
  const { id } = req.query;
  const { currency } = req.body;
  console.log(`received data id: ${id}, currency: ${currency}`);
  if (!id) {
    return next(new AppError("Currency id is required", 400));
  }
  db.query('SELECT cur_name FROM jeweltest.currency WHERE cur_id = ?', [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching currency", 500));
    }
    if (results.length === 0) {
      return next(new AppError("Currency not found", 404));
    }
    const oldCurrency = results[0].cur_name;
    const updatedCurrency = currency || oldCurrency;

    db.query('UPDATE currency SET cur_name = ? WHERE cur_id = ?', [updatedCurrency, id], (err, results) => {
      if (err) {
        return next(new AppError("Database error while updating currency", 500));
      }
      return res.status(200).json({ id, currency: updatedCurrency });
    });
  });
};

const deleteCurrency = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Currency id is required", 400));
  }
  const query = `DELETE FROM jeweltest.currency WHERE cur_id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while deleting currency", 500));
    }
    if (results.affectedRows === 0) {
      return next(new AppError(`Currency with id ${id} not found`, 404));
    }
    return res.status(200).json({ message: `Currency with id ${id} deleted` });
  });
};


module.exports = { currency, addCurrency, updateCurrency, deleteCurrency };
