const {Product, Variant} = require('../database.js');
const mongoose = require('mongoose');
const { AppError } = require('../utils/errorHandler');


const products = async (req, res, next) => {
  try {
    let products = await Product.find()
      .populate('categoryId', 'name subcategories')
      .populate('type', 'name');

    return res.status(200).json({
      message: "Products retrieved successfully",
      products
    });
  } catch (err) {
    return next(err);
  }
};

const productVariants = async (req, res, next) => {
  try {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
      return next(new AppError("Product id is required", 400));
    }
    const products = await Product.find({ _id: id });
    return res.status(200).json({ variants: products[0]?.variants || [] });
  } catch (err) {
    return next(new AppError("Error retrieving product variants", 500));
  }
};

const addProduct = async (req, res, next) => {
  try {
    // Destructure required fields from the request body
    let { name, description, category, type, subcategory, variants_count } = req.body;

    if (!name || !description || !category || !type || !subcategory || !variants_count) {
      return next(new AppError("Missing required fields for product", 400));
    }

    // Trim input values
    category = category.trim();
    subcategory = subcategory.trim();
    type = type.trim();

    // Validate that category, subcategory, and type are valid ObjectId strings
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return next(new AppError("Invalid categoryId format", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(subcategory)) {
      return next(new AppError("Invalid subcategoryId format", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(type)) {
      return next(new AppError("Invalid type format", 400));
    }

    // Convert variants_count to a number and validate it
    const count = parseInt(variants_count, 10);
    if (isNaN(count) || count < 1) {
      return next(new AppError("Invalid variants_count", 400));
    }

    // Pre-generate a new product _id to assign to each variant's productId
    const newProductId = new mongoose.Types.ObjectId();

    // Build an array for variants using the schema's exact field names
    const variantsArray = [];
    for (let i = 0; i < count; i++) {
      const variant = {
        // Use "varirantName" (as defined in your variant schema)
        varirantName: req.body[`variant_${i}_variant_name`],
        price: req.body[`variant_${i}_price`],
        stock: req.body[`variant_${i}_stock`],
        size: req.body[`variant_${i}_size`],
        material: req.body[`variant_${i}_material`],
        images: [], // Will be populated below if images are provided
        productId: newProductId // Pre-assign the productId to meet the schema requirement
      };

      if (
        !variant.varirantName ||
        !variant.price ||
        !variant.stock ||
        !variant.size ||
        !variant.material
      ) {
        return next(new AppError(`Missing required variant fields for variant ${i}`, 400));
      }

      variantsArray.push(variant);
    }

    // Handle file uploads
    // Assume req.files is an array processed by middleware like multer
    const productCoverFile = req.files?.find(file => file.fieldname === 'product_cover');
    const productCoverImage = productCoverFile ? productCoverFile.filename : null;

    // Map variant images by their index (e.g., variant_images_0, variant_images_1, etc.)
    const variantImagesMap = {};
    if (req.files) {
      req.files.forEach(file => {
        if (file.fieldname.startsWith('variant_images_')) {
          // Extract the index from the field name
          const index = file.fieldname.split('variant_images_')[1];
          if (!variantImagesMap[index]) {
            variantImagesMap[index] = [];
          }
          variantImagesMap[index].push(file.filename);
        }
      });
    }

    // Assign images (maximum 4 per variant) to each variant in the array
    variantsArray.forEach((variant, index) => {
      if (variantImagesMap[index]) {
        variant.images = variantImagesMap[index].slice(0, 4);
      }
    });

    // Build the product document using your schema fields:
    // name, description, categoryId, subcategoryId, type, images (array), and variants (embedded)
    const productData = {
      _id: newProductId,
      name,
      description,
      categoryId: category,
      subcategoryId: subcategory,
      type, // Note: Your schema requires a field named "type" (an ObjectId referencing the Type collection)
      images: productCoverImage ? [productCoverImage] : [],
      variants: variantsArray,
    };

    // Create the product
    const newProduct = await Product.create(productData);

    return res.status(201).json({
      message: "Product and variants added successfully",
      product: newProduct,
    });
  } catch (err) {
    return next(err);
  }
};


const updateProduct = async (req, res, next) => {
  try {
    const { productId, name, description, categoryId, subcategoryId, type, images, variants } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: "Product ID is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.name = name || product.name;
    product.description = description || product.description;
    product.categoryId = categoryId || product.categoryId;
    product.subcategoryId = subcategoryId || product.subcategoryId;
    product.type = type || product.type;

    // Update product cover image using Multer file upload
    const productCoverFile = req.files?.find(file => file.fieldname === 'product_cover');
    if (productCoverFile) {
      product.images = [productCoverFile.filename];
    } else if (images) {
      product.images = typeof images === 'string' ? JSON.parse(images) : images;
    }

    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    // Counter for new variants to match file keys correctly
    let newVariantCounter = 0;

    parsedVariants.forEach((variant) => {
      if (variant.variant_id) {
        // Updating existing variant
        const existingVariant = product.variants.id(variant.variant_id);
        if (existingVariant) {
          existingVariant.varirantName = variant.variantName || existingVariant.varirantName;
          existingVariant.price = variant.price || existingVariant.price;
          existingVariant.stock = variant.stock || existingVariant.stock;
          existingVariant.size = variant.size || existingVariant.size;
          existingVariant.material = variant.material || existingVariant.material;
          const variantImagesFiles = req.files?.filter(
            file => file.fieldname === `variant_images_${variant.variant_id}`
          );
          if (variantImagesFiles && variantImagesFiles.length > 0) {
            existingVariant.images = variantImagesFiles.slice(0, 4).map(file => file.filename);
          }
        }
      } else {
        // Adding new variant, ensure productId is set as required by the schema
        const newVariant = {
          varirantName: variant.variantName,
          price: variant.price,
          stock: variant.stock,
          size: variant.size,
          material: variant.material,
          images: [],
          productId: product._id
        };
        const newVariantDoc = product.variants.create(newVariant);
        product.variants.push(newVariantDoc);
        const newVariantImagesFiles = req.files?.filter(
          file => file.fieldname === `variant_images_new_${newVariantCounter}`
        );
        newVariantCounter++; // increment for each new variant added
        if (newVariantImagesFiles && newVariantImagesFiles.length > 0) {
          newVariantDoc.images = newVariantImagesFiles.slice(0, 4).map(file => file.filename);
        }
      }
    });

    const updatedProduct = await product.save();
    return res.status(200).json({ success: true, message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};





const deleteProduct = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Product id is required", 400));
  }
  const product = await Product.findByIdAndUpdate(id, { isDeleted: true });
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  return res.status(200).json({ message: "Product deleted successfully"});
};

const updateVariant = async (req, res, next) => {
  const { id, name, price, stock, size, material, images } = req.body;
  console.log(`recieved data >>>>>` , req.body);
  if (!id) return next(new AppError("Variant id is required", 400));

  const product = await Product.findOne(
    { "variants._id": id },
    { variants: { $elemMatch: { _id: id } } }
  );
  const variant = product?.variants?.[0];
  if (!variant) return next(new AppError("Variant not found", 404));

  const updateName = name || variant.varirantName;
  const updatePrice = price || variant.price;
  const updateStock = stock || variant.stock;
  const updateSize = size || variant.size;
  const updateMaterial = material || variant.material;
  let updateImages = variant.images;

  if (req.files && req.files.length > 0) {
    updateImages = req.files.map(file => file.filename);
  }

  const updatedVariant = await Product.findOneAndUpdate(
    { "variants._id": id },
    {
      $set: {
        "variants.$.varirantName": updateName,
        "variants.$.price": updatePrice,
        "variants.$.stock": updateStock,
        "variants.$.size": updateSize,
        "variants.$.material": updateMaterial,
        "variants.$.images": updateImages
      }
    },
    { new: true }
  );
  return res.status(200).json(updatedVariant);
};
const deleteVariant = async (req, res, next) => {
 try{

  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Variant id is required", 400));
  }
 const product = await Product.findOneAndUpdate(
  { "variants._id": id },
  { $set: { "variants.$.isDeleted": true } },
  { new: true }
 )
 if (!product) {
  return next(new AppError("Variant not found", 404));
 }
  return res.status(200).json({ message: "Variant deleted successfully"});
 }
  catch(err){
    return next(new AppError("Database error while deleting variant", 500));
  }
};


module.exports = {
  addProduct,
  products,
  productVariants,
  deleteProduct,
  deleteVariant,
  updateVariant,
  updateProduct,
};
