const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
const db = require('../database.js')

function setUser(user) {
  return jwt.sign({
    _id: user._id,
    email: user.email,
  }, secret);
}

async function getUser(req) {
  
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.log("No Authorization header found");
    return null;
  }

  const token = authHeader.split(' ')[1]; 
  if (!token) {
    console.log("No token found after Bearer");
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret);

    
    return new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM users WHERE user_id = ? AND user_token = ?',
        [decoded.id, token],
        (err, results) => {
          if (err) {
            console.error("Database error:", err);
            return reject(err);
          }
 
          if (results.length === 0) {
            console.log("No matching user/token in database");
            return resolve(null);
          }
          return resolve(decoded);
        }
      );
    });
    
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

module.exports = {
  setUser,
  getUser
};