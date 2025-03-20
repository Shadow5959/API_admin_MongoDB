const { getUser } = require('../service/auth.js');



async function restrictToLoggedinUserOnly(req, res, next) {


  try {
    const user = await getUser(req);


    if (!user) {

      return res.status(401).json({ message: 'Unauthorized' });
    }


    next();
  } catch (error) {
    console.error("🚨 Authentication error:", error);
    return res.status(500).json({ message: 'Server error' });
  }
}


module.exports = {
  restrictToLoggedinUserOnly,
};