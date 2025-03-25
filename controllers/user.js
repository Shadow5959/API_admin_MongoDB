const { User, Order } = require("../database.js");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { AppError } = require("../utils/errorHandler");

const register = async (req, res, next) => {
  const { name, email, password, cpassword, phone: number, gender } = req.body;
  console.log(req.body);
  const phone = parseInt(number);
  console.log(
    `received data name: ${name}, email: ${email}, password: ${password}, cpassword: ${cpassword}, phone: ${phone}, gender: ${gender}`
  );

  if (!name || !password || !cpassword || !email || !phone || !gender) {
    return next(
      new AppError(
        "Name, password, confirm password, email, gender, and phone are required",
        400
      )
    );
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
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const results = await User.create({
      _id: userId,
      name: name,
      email: email,
      password: hashedPassword,
      phoneNumber: phone,
      gender: gender,
      token: token, // Include the token in the User.create call
    });
    console.log(results);

    console.log(`The token is: ${token}`);
    res.setHeader("Authorization", `Bearer ${token}`);
    res.setHeader("User-Id", userId);
    res.setHeader("User-Email", email);
    return res.status(200).json({ token, results });
  } catch (error) {
    console.error(error);
    return next(new AppError("Server error during registration", 500));
  }
};

const login = async (req, res, next) => {
  const { email, number, password } = req.body;
  console.log(
    `received data email: ${email}, number: ${number}, password: ${password}`
  );
  if ((!email && !number) || !password) {
    return next(
      new AppError("Either email or number, and password are required", 400)
    );
  }
  const result = await User.find({
    $and: [
      { $or: [{ email: email }, { phoneNumber: number }] },
      { isDeleted: false },
    ],
  });
  if (result.length === 0) {
    return next(new AppError("User not found", 404));
  }
  const user = result[0];
  console.log("user>>>>", user);
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new AppError("Incorrect password", 401));
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  console.log(`The token is: ${token}`);

  res.setHeader("Authorization", `Bearer ${token}`);
  res.setHeader("User-Id", user._id.toString());
  res.setHeader("User-Email", user.email);
  await User.updateOne({ _id: user._id }, { token: token });
  return res.status(200).json({ token, user });
};

const addAddress = async (req, res, next) => {
  const { id, address, city, state, country, pincode } = req.body;
  console.log(
    `received data id: ${id}, address: ${address}, city: ${city}, state: ${state}, country: ${country}, pincode: ${pincode}`
  );

  if (!id || !address || !city || !state || !country || !pincode) {
    return next(
      new AppError(
        "User id, address, city, state, country, and pincode are required",
        400
      )
    );
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

    return res
      .status(200)
      .json({ message: "Address added successfully", addressId });
  } catch (error) {
    console.error(error);
    return next(new AppError("Server error while adding address", 500));
  }
};

const addOrder = async (req, res, next) => {
  let { user, orderNumber, address, items, totalamount } = req.body;
  console.log(
    `received data user: ${user}, orderNumber: ${orderNumber}, address: ${address}, items: ${items}`
  );

  if (!user || !orderNumber || !address || !items) {
    return next(
      new AppError("User, order number, address, and items are required", 400)
    );
  }

  // Parse items if passed as a JSON string
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (err) {
      return next(new AppError("Invalid items JSON", 400));
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return next(
      new AppError("Items must be an array with at least one item", 400)
    );
  }

  try {
    const order = new Order({
      user: user,
      orderNumber: orderNumber,
      address: address,
      items: items,
      totalAmount: totalamount,
    });

    const savedOrder = await order.save();

    // Update the User document to include this order in the orders array.
    await User.findByIdAndUpdate(user, { $push: { orders: savedOrder._id } });

    const userOrders = await Order.find({ user: user });

    return res.status(200).json({
      message: "Order added successfully",
      order: savedOrder,
      userOrders,
    });
  } catch (error) {
    console.error(error);
    return next(new AppError("Server error while adding order", 500));
  }
};
const user = async (req, res, next) => {
  const { email } = req.query;
  console.log(`Received email: ${email}`);

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  try {
    const user = await User.findOne({
      email: email,
      isDeleted: false,
    }).populate({
      path: "orders",
      select: "orderNumber items totalAmount status",
      populate: [
        {
          path: "items.product",
          model: "Product",
          select: "name variants",
        },
      ],
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return next(new AppError(error.message || "Something went wrong", 500));
  }
};

const logout = async (req, res, next) => {
  res.clearCookie("jwt");
  return res.status(200).json({ message: "Logged out" });
};

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
    address: results.address.filter((addr) => !addr.isDeleted),
  };
  console.log(user);
  return res.status(200).json(user);
};

const userOrders = async (req, res, next) => {
  const { email } = req.query;
  console.log(`Received email: ${email}`);

  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  try {
    const user = await User.findOne({
      email: email,
      isDeleted: false,
    }).populate({
      path: "orders",
      select: "orderNumber items totalAmount status",
      populate: [
        {
          path: "items.product",
          model: "Product",
          select: "name variants",
        },
      ],
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return next(new AppError(error.message || "Something went wrong", 500));
  }
};

const updateAddress = async (req, res, next) => {
  const { id, address_id } = req.query;
  const { address, city, state, country, pincode } = req.body;
  console.log(
    `received data id: ${id}, address: ${address}, city: ${city}, state: ${state}, country: ${country}, pincode: ${pincode}`
  );
  if (
    !id ||
    !address ||
    !address_id ||
    !city ||
    !state ||
    !country ||
    !pincode
  ) {
    return next(
      new AppError(
        "User id, address, city, state, country, and pincode are required",
        400
      )
    );
  }
  const addressResults = await User.updateOne(
    { _id: id, "address._id": address_id },
    {
      $set: {
        "address.$.address": address,
        "address.$.city": city,
        "address.$.state": state,
        "address.$.country": country,
        "address.$.pincode": pincode,
      },
    }
  );
  if (addressResults.modifiedCount === 0) {
    return next(new AppError("Failed to update address", 500));
  }
  return res.status(200).json({
    id,
    address_id,
    address,
    city,
    state,
    country,
    pincode,
    message: "Address updated successfully",
  });
};

const deleteAddress = async (req, res, next) => {
  const { id, address_id } = req.query;
  console.log(`received id: ${id}, address_id: ${address_id}`);
  if (!id || !address_id) {
    return next(new AppError("User id and address id are required", 400));
  }
  const addressResults = await User.updateOne(
    { _id: id, "address._id": address_id },
    {
      $set: {
        "address.$.isDeleted": true,
      },
    }
  );
  if (addressResults.modifiedCount === 0) {
    return next(new AppError("Failed to delete address", 500));
  }
  return res
    .status(200)
    .json({ id, address_id, message: "Address deleted successfully" });
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
      },
    }
  );
  if (userResults.modifiedCount === 0) {
    return next(new AppError("Failed to update user", 500));
  }
  return res.status(200).json({
    id,
    name: updatedName,
    gender: updatedGender,
    email: updatedEmail,
    message: "User updated",
  });
};

const updateOrder = async (req, res, next) => {
  const { id, status, order_id } = req.body;
  console.log(
    `Received data user_id: ${id}, status: ${status}, order_id: ${order_id}`
  );

  if (!id || !status || !order_id) {
    return next(
      new AppError("User id, order id, and status are required", 400)
    );
  }

  try {
    const order = await Order.findOneAndUpdate(
      { _id: order_id, user: id },
      { status: status },
      { new: true }
    );

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    return res
      .status(200)
      .json({ message: "Order updated successfully", order });
  } catch (error) {
    console.error("Error updating order:", error);
    return next(new AppError("Error updating order", 500));
  }
};

module.exports = {
  register,
  user,
  login,
  addAddress,
  address,
  updateAddress,
  deleteAddress,
  updateUser,
  logout,
  addOrder,
  userOrders,
  updateOrder,
};
