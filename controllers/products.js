const db = require('../database.js');
const { AppError } = require('../utils/errorHandler');

const products = async (req, res, next) => {
  const query = `SELECT * from jeweltest.product p
    LEFT JOIN jeweltest.variant v on p.product_id = v.product_id
    LEFT JOIN jeweltest.category c on p.cat_id = c.cat_id
    LEFT JOIN jeweltest.productimages pi on v.variant_id = pi.variant_id
    where p.product_active = 1 and v.variant_active = 1
    group by p.product_id, v.variant_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching products", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No products found", 404));
    }
    const sortObjectKeys = (obj) =>
      Object.keys(obj)
        .sort()
        .reduce((sortedObj, key) => {
          sortedObj[key] = obj[key];
          return sortedObj;
        }, {});
    const sortedResults = results.map(result => sortObjectKeys(result));
    return res.status(200).json(sortedResults);
  });
};

const productVariants = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Product id is required", 400));
  }
  const query = `SELECT v.*, pi.image_url FROM jeweltest.variant v
    LEFT JOIN jeweltest.productimages pi on v.variant_id = pi.variant_id
    WHERE v.product_id = ? And v.variant_active = 1`;
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching product variants", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No variants found for this product", 404));
    }
    const sortObjectKeys = (obj) =>
      Object.keys(obj)
        .sort()
        .reduce((sortedObj, key) => {
          sortedObj[key] = obj[key];
          return sortedObj;
        }, {});
    const sortedResults = results.map(result => sortObjectKeys(result));
    return res.status(200).json(sortedResults);
  });
};

const addProduct = async (req, res, next) => {
  const { name, description, category, type, subcategory, variants_count } = req.body;

  if (!name || !category || !type || !subcategory || !variants_count) {
    return next(new AppError("Missing required fields for product", 400));
  }

  const count = parseInt(variants_count, 10);
  if (isNaN(count) || count < 1) {
    return next(new AppError("Invalid variants_count", 400));
  }

  const variantsArray = [];
  for (let i = 0; i < count; i++) {
    const variant = {
      variant_name: req.body[`variant_${i}_variant_name`],
      price: req.body[`variant_${i}_price`],
      stock: req.body[`variant_${i}_stock`],
      size: req.body[`variant_${i}_size`],
      material: req.body[`variant_${i}_material`],
    };

    if (!variant.variant_name || !variant.price || !variant.stock || !variant.size || !variant.material) {
      return next(new AppError(`Missing required variant fields for variant ${i}`, 400));
    }
    variantsArray.push(variant);
  }

  let productCoverFile = req.files.find(file => file.fieldname === 'product_cover');
  const variantImagesMap = {};
  req.files.forEach(file => {
    if (file.fieldname.startsWith('variant_images_')) {
      const index = file.fieldname.split('variant_images_')[1];
      if (!variantImagesMap[index]) {
        variantImagesMap[index] = [];
      }
      variantImagesMap[index].push(file);
    }
  });

  db.getConnection((err, connection) => {
    if (err) {
      return next(new AppError("Error getting database connection", 500));
    }

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        return next(new AppError("Error starting transaction", 500));
      }

      const productData = {
        product_name: name,
        product_desc: description,
        cat_id: category,
        type_id: type,
        subcategory_id: subcategory,
        product_cover: productCoverFile ? productCoverFile.filename : null,
        created_at: new Date()
      };

      connection.query('INSERT INTO product SET ?', productData, (err, productResults) => {
        if (err) {
          connection.rollback(() => {
            connection.release();
            return next(new AppError("Error inserting product", 500));
          });
        }

        const productId = productResults.insertId;
        const variantQuery = `
          INSERT INTO variant 
          (variant_name, product_id, product_name, price, stock, size, material)
          VALUES ?`;
        const variantValues = variantsArray.map(variant => [
          variant.variant_name,
          productId,
          name,
          variant.price,
          variant.stock,
          variant.size,
          variant.material
        ]);

        connection.query(variantQuery, [variantValues], (err, variantResult) => {
          if (err) {
            connection.rollback(() => {
              connection.release();
              return next(new AppError("Error inserting variants", 500));
            });
          }

          const imageQuery = 'INSERT INTO productimages (variant_id, image_url) VALUES ?';
          const variantImages = [];

          variantsArray.forEach((variant, index) => {
            const variantId = variantResult.insertId + index;
            if (variantImagesMap[index]) {
              let images = variantImagesMap[index].slice(0, 4);
              images.forEach(image => {
                variantImages.push([variantId, image.filename]);
              });
            }
          });

          if (variantImages.length > 0) {
            connection.query(imageQuery, [variantImages], (err) => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  return next(new AppError("Error inserting variant images", 500));
                });
              }
              connection.commit(err => {
                if (err) {
                  connection.rollback(() => {
                    connection.release();
                    return next(new AppError("Error committing transaction", 500));
                  });
                }
                connection.release();
                return res.status(201).json({
                  message: "Product, variants, and images added successfully",
                  product_id: productId,
                  variants_inserted: variantResult.affectedRows
                });
              });
            });
          } else {
            connection.commit(err => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  return next(new AppError("Error committing transaction", 500));
                });
              }
              connection.release();
              return res.status(201).json({
                message: "Product and variants added successfully",
                product_id: productId,
                variants_inserted: variantResult.affectedRows
              });
            });
          }
        });
      });
    });
  });
};

const updateProduct = async (req, res, next) => {
  let connection;
  try {
    const productId = req.query.id;
    if (!productId) {
      return next(new AppError("Product id is required", 400));
    }

    const { product_name, product_desc, category, type, subcategory, variants } = req.body;
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const files = req.files || [];

    const [currentProducts] = await connection.query(
      'SELECT * FROM product WHERE product_id = ?',
      [productId]
    );
    if (currentProducts.length === 0) {
      await connection.rollback();
      connection.release();
      return next(new AppError("Product not found", 404));
    }
    const currentProduct = currentProducts[0];

    const productCoverFile = files.find(file => file.fieldname === 'product_cover');

    const productUpdateData = {
      product_name: product_name !== undefined ? product_name : currentProduct.product_name,
      product_desc: product_desc !== undefined ? product_desc : currentProduct.product_desc,
      cat_id: category !== undefined ? category : currentProduct.cat_id,
      type_id: type !== undefined ? type : currentProduct.type_id,
      subcategory_id: subcategory !== undefined ? subcategory : currentProduct.subcategory_id,
      updated_at: new Date()
    };
    if (productCoverFile) {
      productUpdateData.product_cover = productCoverFile.filename;
    }

    await connection.query('UPDATE product SET ? WHERE product_id = ?', [
      productUpdateData,
      productId
    ]);

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (e) {
        await connection.rollback();
        connection.release();
        return next(new AppError("Invalid variants JSON", 400));
      }
    }

    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      if (variant.variant_id) {
        const updateVariantData = {
          variant_name: variant.variant_name,
          price: variant.price,
          stock: variant.stock,
          size: variant.size,
          material: variant.material
        };
        await connection.query('UPDATE variant SET ? WHERE variant_id = ?', [
          updateVariantData,
          variant.variant_id
        ]);

        const variantImagesFiles = files.filter(file => file.fieldname === `variant_images_${variant.variant_id}`);
        if (variantImagesFiles.length > 0) {
          await connection.query('DELETE FROM productimages WHERE variant_id = ?', [variant.variant_id]);
          const limitedFiles = variantImagesFiles.slice(0, 4);
          const imagesValues = limitedFiles.map(file => [variant.variant_id, file.filename]);
          if (imagesValues.length > 0) {
            await connection.query(
              'INSERT INTO productimages (variant_id, image_url) VALUES ?',
              [imagesValues]
            );
          }
        }
      }
    }

    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      if (!variant.variant_id) {
        const insertVariantData = {
          variant_name: variant.variant_name,
          product_id: productId,
          product_name: productUpdateData.product_name,
          price: variant.price,
          stock: variant.stock,
          size: variant.size,
          material: variant.material
        };
        const [result] = await connection.query('INSERT INTO variant SET ?', [insertVariantData]);
        const newVariantId = result.insertId;

        const newVariantImagesFiles = files.filter(file => file.fieldname === `variant_images_new_${i}`);
        if (newVariantImagesFiles.length > 0) {
          const limitedFiles = newVariantImagesFiles.slice(0, 4);
          const imagesValues = limitedFiles.map(file => [newVariantId, file.filename]);
          if (imagesValues.length > 0) {
            await connection.query(
              'INSERT INTO productimages (variant_id, image_url) VALUES ?',
              [imagesValues]
            );
          }
        }
      }
    }

    await connection.commit();
    connection.release();
    return res.status(200).json({ message: 'Product, variants, and images updated successfully' });
  } catch (error) {
    console.error(error);
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    return next(new AppError("Server error during product update", 500));
  }
};

const deleteProduct = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Product id is required", 400));
  }
  const query = `UPDATE jeweltest.product p
             LEFT JOIN jeweltest.variant v ON p.product_id = v.product_id
             SET p.product_active = 0, v.variant_active = 0
             WHERE p.product_id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while deleting product", 500));
    }
    return res.status(200).json({ id });
  });
};

const updateVariant = async (req, res, next) => {
  const { id, name, price, stock, size, material } = req.body;
  console.log(`received data id: ${id}, name: ${name}, price: ${price}, stock: ${stock}, size: ${size}, material: ${material}`);
  if (!id) {
    return next(new AppError("Variant id is required", 400));
  }
  db.query('SELECT variant_name FROM jeweltest.variant WHERE variant_id = ?', [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching variant", 500));
    }
    if (results.length === 0) {
      return next(new AppError("Variant not found", 404));
    }
    const oldName = results[0].variant_name;
    const updatedName = name || oldName;

    db.query('UPDATE variant SET variant_name = ?, price = ?, stock = ?, size = ?, material = ? WHERE variant_id = ?', [updatedName, price, stock, size, material, id], (err, results) => {
      if (err) {
        return next(new AppError("Database error while updating variant", 500));
      }
      return res.status(200).json({ id, name: updatedName, price, stock, size, material });
    });
  });
};

const deleteVariant = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("Variant id is required", 400));
  }
  const query = `UPDATE jeweltest.variant SET variant_active = 0 WHERE variant_id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while deleting variant", 500));
    }
    return res.status(200).json({ id });
  });
};

module.exports = {
  products,
  productVariants,
  addProduct,
  updateProduct,
  deleteProduct,
  updateVariant,
  deleteVariant
};
