const express = require('express');
const router = express.Router();
const { products, productVariants, addProduct, updateProduct, deleteProduct, updateVariant, deleteVariant } = require('../controllers/products');
const { categories, addCategory, deleteCategory, subcategory, addSubcategory, updateSubcategory, deleteSubcategory, types } = require('../controllers/categories');
const { currency, addCurrency, updateCurrency, deleteCurrency } = require('../controllers/currency');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const fs = require('fs');
const multer = require('multer');
const { restrictToLoggedinUserOnly } = require('../middlewares/auth.js');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage }).any();









router.get('/products',restrictToLoggedinUserOnly,cacheMiddleware, products);
router.get('/categories',restrictToLoggedinUserOnly,cacheMiddleware,categories);
router.get('/currency', restrictToLoggedinUserOnly,cacheMiddleware, currency);
router.get('/productvariants', restrictToLoggedinUserOnly,cacheMiddleware,productVariants);
router.get('/subcategory', restrictToLoggedinUserOnly,cacheMiddleware,subcategory);
router.get('/types', restrictToLoggedinUserOnly,cacheMiddleware,types);


router.post('/addProduct',restrictToLoggedinUserOnly, upload, addProduct);
router.post('/addcategory', restrictToLoggedinUserOnly,addCategory);
router.post('/addcurrency', restrictToLoggedinUserOnly,addCurrency);
router.post('/addsucategory', restrictToLoggedinUserOnly,addSubcategory);

router.put('/updateproduct', restrictToLoggedinUserOnly,upload, updateProduct);
router.put('/updatecurrency', restrictToLoggedinUserOnly,updateCurrency);
router.put('/updatesubcategory', restrictToLoggedinUserOnly,updateSubcategory);
router.put('/updatevariant', restrictToLoggedinUserOnly,updateVariant);

router.delete('/deleteproduct', restrictToLoggedinUserOnly,deleteProduct);
router.delete('/deletecategory', restrictToLoggedinUserOnly,deleteCategory);
router.delete('/deletecurrency', restrictToLoggedinUserOnly,deleteCurrency);
router.delete('/deletesubcategory', restrictToLoggedinUserOnly,deleteSubcategory);
router.delete('/deletevariant', restrictToLoggedinUserOnly,deleteVariant);

module.exports = router;

