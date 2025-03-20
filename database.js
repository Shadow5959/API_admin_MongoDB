const mongoose = require('mongoose');
 mongoose.connect('mongodb://localhost:27017/jeweltest')
.then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));


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





module.exports = {User};