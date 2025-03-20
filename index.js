const app = require('./server.js');

const dotenv = require('dotenv');
dotenv.config();
const userRoutes = require('./routes/user.js');
const productRoutes = require('./routes/products.js');
const { AppError, globalErrorHandler } = require("./utils/errorHandler.js");

app.use('/', userRoutes);
app.use('/', productRoutes);
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });
  
  
 app.use(globalErrorHandler);


    

  


   
    

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});


