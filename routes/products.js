const express = require('express');
const router = express.Router();
const { addProduct,products,productVariants,updateVariant,deleteProduct, deleteVariant, updateProduct } = require('../controllers/products');
const { categories, addCategory, deleteCategory, subcategory,updateCategory, addSubcategory, updateSubcategory, deleteSubcategory, types } = require('../controllers/categories');
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









router.get('/products', products);
router.get('/categories',categories);
router.get('/productvariants',productVariants);
router.get('/subcategory', subcategory);
router.get('/types',types);


router.post('/addProduct', upload, addProduct);
router.post('/addcategory',addCategory);
router.post('/addsubcategory',addSubcategory);

router.put('/updateproduct',upload, updateProduct);
router.put('/updatecategory',updateCategory);
router.put('/updatesubcategory', updateSubcategory);
router.put('/updatevariant', upload, updateVariant);

router.delete('/deleteproduct', deleteProduct);
router.delete('/deletecategory',deleteCategory);
router.delete('/deletesubcategory', deleteSubcategory);
router.delete('/deletevariant', deleteVariant);

module.exports = router;

