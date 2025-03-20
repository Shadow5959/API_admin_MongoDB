const {User} = require('../database.js');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/errorHandler');

const register = async (req, res, next) => {
  const { name, email, password, cpassword, phone: number, gender } = req.body;
  console.log(req.body);
  const phone = parseInt(number);
  console.log(`received data name: ${name}, email: ${email}, password: ${password}, cpassword: ${cpassword}, phone: ${phone}, gender: ${gender}`);

  if (!name || !password || !cpassword || !email || !phone || !gender) {
    return next(new AppError("Name, password, confirm password, email, gender, and phone are required", 400));
  }

  if (password !== cpassword) {
    return next(new AppError("Passwords do not match", 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Invalid email format", 400));
  }

  if (isNaN(phone) || phone.toString().length < 10) {
    return next(new AppError("Invalid phone number", 400));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = new mongoose.Types.ObjectId(); // Generate a new ObjectId for the user
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const results = await User.create({
      _id: userId,
      name: name,
      email: email,
      password: hashedPassword,
      phoneNumber: phone,
      gender: gender,
      token: token // Include the token in the User.create call
    });
    console.log(results);
           
            console.log(`The token is: ${token}`);
            res.setHeader('Authorization', `Bearer ${token}`);
            res.setHeader('User-Id', userId);
            res.setHeader('User-Email', email);
            return res.status(200).json({ token, results });
  } catch (error) {
    console.error(error);
    return next(new AppError("Server error during registration", 500));
  }
};

const login = async (req, res, next) => {
  const { email, number, password } = req.body;
  console.log(`received data email: ${email}, number: ${number}, password: ${password}`);
  if ((!email && !number) || !password) {
    return next(new AppError("Either email or number, and password are required", 400));
  }
  const result = await User.find({ $and: [{ $or: [{ email: email }, { phoneNumber: number }] }, { isDeleted: false }] });
  if (result.length === 0) {
    return next(new AppError("User not found", 404));
  }
  const user = result[0];
  console.log('user>>>>', user);
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new AppError("Incorrect password", 401));
  }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    console.log(`The token is: ${token}`);
    
    res.setHeader('Authorization', `Bearer ${token}`);
    res.setHeader('User-Id', user._id.toString());
    res.setHeader('User-Email', user.email);
    await User.updateOne({ _id: user._id }, { token: token });
    return res.status(200).json({ token, user }); 
};

const addAddress = async (req, res, next) => {
  const { id, address, city, state, country, pincode } = req.body;
  console.log(`received data id: ${id}, address: ${address}, city: ${city}, state: ${state}, country: ${country}, pincode: ${pincode}`);

  if (!id || !address || !city || !state || !country || !pincode) {
    return next(new AppError("User id, address, city, state, country, and pincode are required", 400));
  }

  try {
    const addressId = new mongoose.Types.ObjectId();
    const addressResults = await User.updateOne(
      { _id: id },
      {
        $push: {
          address: {
            _id: addressId,
            address: address,
            city: city,
            state: state,
            country: country,
            pincode: pincode,
          },
        },
      }
    );

    if (addressResults.modifiedCount === 0) {
      return next(new AppError("Failed to add address", 500));
    }

    return res.status(200).json({ message: "Address added successfully", addressId });
  } catch (error) {
    console.error(error);
    return next(new AppError("Server error while adding address", 500));
  }
};

// const userOrder = async (req, res, next) => {
//   let { id, total_amount, status, currency, variant_id, quantity, address_id } = req.body;
//   console.log(`received data id: ${id}, total_amount: ${total_amount}, address_id: ${address_id}, status: ${status}, currency: ${currency}, variant_id: ${variant_id}, quantity: ${quantity}`);
//   if (!id || !total_amount || !status || !currency || !variant_id || !quantity) {
//     return next(new AppError("Missing required fields for order", 400));
//   }
//   db.query('SELECT cur_id FROM jeweltest.currency WHERE cur_name = ?', [currency], (err, currencyResults) => {
//     if (err) {
//       return next(new AppError("Database error while fetching currency", 500));
//     }
//     if (currencyResults.length === 0) {
//       return next(new AppError("Currency not found", 404));
//     }
//     const cur_id = currencyResults[0].cur_id;
//     db.query('SELECT price, stock FROM jeweltest.variant WHERE variant_id = ?', [variant_id], (err, variantResults) => {
//       if (err) {
//         return next(new AppError("Database error while fetching variant", 500));
//       }
//       if (variantResults.length === 0) {
//         return next(new AppError("Variant not found", 404));
//       }
//       const { price, stock } = variantResults[0];
//       if (stock < quantity) {
//         return next(new AppError("Insufficient stock", 400));
//       }
//       const orderDate = new Date();
//       const totalamount = price * quantity;
//       db.query('INSERT INTO orders SET ?', { user_id: id, totalamount, order_date: orderDate, order_address_id: address_id, status, cur_id }, (err, orderResults) => {
//         if (err) {
//           return next(new AppError("Database error while creating order", 500));
//         }
//         const orderId = orderResults.insertId;
//         db.query('INSERT INTO orderitems SET ?', { order_id: orderId, variant_id, quantity, price }, (err) => {
//           if (err) {
//             return next(new AppError("Database error while adding order items", 500));
//           }
//           db.query('UPDATE jeweltest.variant SET stock = stock - ? WHERE variant_id = ?', [quantity, variant_id], (err) => {
//             if (err) {
//               return next(new AppError("Database error while updating stock", 500));
//             }
//             return res.status(200).json({ id, total_amount, status, currency, variant_id, quantity, price });
//           });
//         });
//       });
//     });
//   });
// };

const user = async (req, res, next) => {
  const { email } = req.query;
  console.log(`received email: ${email}`);
  if (!email) {
    return next(new AppError("Email is required", 400));
  }
  const results = await User.find( {$and: [{ email: email},{ isDeleted: false }] });
  if (results.length === 0) {
    return next(new AppError("User not found", 404));
  }
  console.log(results);
  const user = results[0];
  return res.status(200).json(user);
};

// const logout = async (req, res, next) => {
//   res.clearCookie('jwt');
//   return res.status(200).json({ message: "Logged out" });
// };

const address = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("User id is required", 400));
  }
  const results = await User.findOne({ _id: id });
  
  if (results.length === 0) {
    return next(new AppError("User not found", 404));
  }
  const user = {
    _id: results._id,
    address: results.address.filter(addr => !addr.isDeleted)
  };
  console.log(user);
  return res.status(200).json(user);
}

// const userOrders = async (req, res, next) => {
//   const { id } = req.query;
//   console.log(`received id: ${id}`);
//   if (!id) {
//     return next(new AppError("User id is required", 400));
//   }
//   const userQuery = 'SELECT user_name, user_email, user_number FROM jeweltest.users WHERE user_id = ?';
//   db.query(userQuery, [id], (err, userResults) => {
//     if (err) {
//       return next(new AppError("Database error while fetching user", 500));
//     }
//     if (userResults.length === 0) {
//       return next(new AppError("User not found", 404));
//     }
//     const user = userResults[0];
//     const orderQuery = `
//         SELECT o.order_id, o.order_date, o.total_amount, o.status, o.status_label as status, c.cur_name
//         FROM jeweltest.orders o
//         LEFT JOIN jeweltest.currency c ON o.cur_id = c.cur_id
//         WHERE o.user_id = ?
//     `;
//     db.query(orderQuery, [id], (err, orderResults) => {
//       if (err) {
//         return next(new AppError("Database error while fetching orders", 500));
//       }
//       const orderIds = orderResults.map(order => order.order_id);
//       if (orderIds.length === 0) {
//         return res.status(200).json({ user, orders: [] });
//       }
//       const itemsQuery = `
//           SELECT oi.order_id, oi.variant_id, v.variant_name, oi.quantity, oi.price
//           FROM jeweltest.orderitems oi
//           LEFT JOIN jeweltest.variant v ON oi.variant_id = v.variant_id
//           WHERE oi.order_id IN (?)
//       `;
//       db.query(itemsQuery, [orderIds], (err, itemsResults) => {
//         if (err) {
//           return next(new AppError("Database error while fetching order items", 500));
//         }
//         const ordersWithItems = orderResults.map(order => {
//           const items = itemsResults.filter(item => item.order_id === order.order_id);
//           return { ...order, items };
//         });
//         return res.status(200).json({ user, orders: ordersWithItems });
//       });
//     });
//   });
// };

const updateAddress = async (req, res, next) => {
  const { id, address_id } = req.query;
  const { address, city, state, country, pincode } = req.body;
  console.log(`received data id: ${id}, address: ${address}, city: ${city}, state: ${state}, country: ${country}, pincode: ${pincode}`);
  if (!id || !address || !address_id || !city || !state || !country || !pincode) {
    return next(new AppError("User id, address, city, state, country, and pincode are required", 400));
  }
  const addressResults = await User.updateOne(
    { _id: id, 'address._id': address_id },
    {
      $set: {
        'address.$.address': address,
        'address.$.city': city,
        'address.$.state': state,
        'address.$.country': country,
        'address.$.pincode': pincode,
      },
    }
  );
  if (addressResults.modifiedCount === 0) {
    return next(new AppError("Failed to update address", 500));
  }
  return res.status(200).json({ id, address_id, address, city, state, country, pincode, message: "Address updated successfully" });
};

const deleteAddress = async (req, res, next) => {
  const { id, address_id } = req.query;
  console.log(`received id: ${id}, address_id: ${address_id}`);
  if (!id || !address_id) {
    return next(new AppError("User id and address id are required", 400));
  }
  const addressResults = await User.updateOne(
    { _id: id, 'address._id': address_id },
    {
      $set: {
        'address.$.isDeleted': true,
      },
    }
  );
  if (addressResults.modifiedCount === 0) {
    return next(new AppError("Failed to delete address", 500));
  }
  return res.status(200).json({ id, address_id, message: "Address deleted successfully" });
};
const updateUser = async (req, res, next) => {
  const { name, gender, email } = req.body;
  const { id } = req.query;
  console.log(`received data id: ${id}, name: ${name}, gender: ${gender}`);
  if (!id) {
    return next(new AppError("User id is required", 400));
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Invalid email format", 400));
  }
  const results = await User.find({ _id: id });
  if (results.length === 0) {
    return next(new AppError("User not found", 404));
  }
    const user = results[0];
    const updatedName = name || user.name;
    const updatedGender = gender || user.gender;
    const updatedEmail = email || user.email;

  const emailCheck = await User.find({ email: updatedEmail });
  if (emailCheck.length > 0) {
    return next(new AppError("Email already exists", 400));
  }
  const userResults = await User.updateOne(
    { _id: id },
    {
      $set: {
        name: updatedName,
        gender: updatedGender,
        email: updatedEmail,
  }
});
  if (userResults.modifiedCount === 0) {
    return next(new AppError("Failed to update user", 500));
  }
  return res.status(200).json({ id, name: updatedName, gender: updatedGender, email: updatedEmail, message: "User updated" });
};

// const updateOrder = async (req, res, next) => {
//   const { id, status, order_id } = req.body;
//   console.log(`Received data user_id: ${id}, status: ${status}, order_id: ${order_id}`);

//   if (!id || !status || !order_id) {
//     return next(new AppError("User id, order id, and status are required", 400));
//   }

//   const validStatuses = ['pending', 'packing', 'intransit', 'canceled', 'returned', 'delivered'];
//   if (!validStatuses.includes(status)) {
//     return next(new AppError("Invalid status", 400));
//   }

//   const the_Status = status === 'pending' ? 0 :
//                     status === 'packing' ? 1 :
//                     status === 'intransit' ? 2 :
//                     status === 'delivered' ? 3 :
//                     status === 'canceled' ? 4 :
//                     status === 'returned' ? 5 : 0;

//   let order_completed_date = (the_Status === 3) ? new Date() : null;
//   const theStatus = (the_Status).toString();

//   db.query(
//     'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
//     [order_id, id],
//     (err, results) => {
//       if (err) {
//         return next(new AppError("Database error while fetching order", 500));
//       }
//       if (results.length === 0) {
//         return next(new AppError("Order not found or not authorized", 404));
//       }
      
//       db.query(
//         'UPDATE orders SET status = ?, order_completed_date = ? WHERE order_id = ? AND user_id = ?',
//         [theStatus, order_completed_date, order_id, id],
//         (err, updateResults) => {
//           if (err) {
//             return next(new AppError("Database error while updating order", 500));
//           }
//           return res.status(200).json({ order_id, status, numericStatus: theStatus });
//         }
//       );
//     }
//   );
// };

module.exports = { register, user, login, addAddress, address, updateAddress, deleteAddress, updateUser  };