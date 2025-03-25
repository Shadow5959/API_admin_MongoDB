const mongoose = require('mongoose');

 mongoose.connect('mongodb://localhost:27017/jeweltest')
.then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));


const typeSchema = new mongoose.Schema({
    name:{
        type: String,
        required:true
    },
    isDeleted:{
        type: Boolean,
        default:false,
        required:true,
    }
},{timestamps:true});

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    categoryId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required:true
    },
        
   
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    subcategories: [subcategorySchema], 
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const variantSchema = new mongoose.Schema({
    productId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required:true
    },
    varirantName:{
        type: String,
        required:true
    },
    price:{
        type: Number,
        required:true
    },
    stock:{
        type: Number,
        required:true
    },
    size:{
        type: String,
        required:true
    },
    material:{
        type: String,
        required:true
    },
    images:{
        type: [String],
        required:true
    },
    isDeleted:{
        type: Boolean,
        default:false,
    }

});

const productSchema = new mongoose.Schema({
    name:{
        type: String,
        required:true
    },
    description:{
        type: String,
        required:true
    },
    categoryId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required:true
    },
    subcategoryId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
        required:true
    },
    type:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Type',
        required:true
    },
    images:{
        type: [String],
        required:true
    },
    variants:[variantSchema],
    isDeleted:{
        type: Boolean,
        default:false,
    }
},{timestamps:true});


const addressSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    address:{
        type: String,
        required:true
    },
    city:{
        type: String,
        required:true
    },
    state:{
        type: String,
        required:true
    },
    pincode:{
        type: String,
        required:true
    },
    isDeleted:{
        type: Boolean,
        default:false,
    }
},{timestamps:true});


const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Store only the _id of the selected address from the user's embedded addresses.
  address: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      variant: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    required: true
  }
}, { timestamps: true });





const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required:true
        
    },
    email: {
        type: String,
        required:true,
        unique: true
    },
    phoneNumber:{
        type: String,
        required:true,
        unique: true
    },
    password:{
        type: String,
        required:true
    },
    gender:{
        type: String,
        enum: ['Male', 'Female'],
        required: true
    },
    address: [addressSchema],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }],
    token:{
        type: String,
        required:true
    },
    isVerified:{
        type: Boolean,
        default:true,
    },
    isDeleted:{
        type: Boolean,
        default:false,
    }
    

},{timestamps:true});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Type = mongoose.model('Type', typeSchema);
const Category = mongoose.model('Category', categorySchema);
const Order = mongoose.model('Order', orderSchema);



module.exports = {User, Product, Type, Category, Order };