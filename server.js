const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const logger = require('./utils/logger.js');
const morgan = require('morgan');




const morganFormat = ":method :url :status :response-time ms";




const imageDirectory = path.join(__dirname, 'public/images');
const cookieParser = require('cookie-parser');

app.use(
    morgan(morganFormat, {
      stream: {
        write: (message) => {
          const logObject = {
            method: message.split(" ")[0],
            url: message.split(" ")[1],
            status: message.split(" ")[2],
            responseTime: message.split(" ")[3],
          };
          logger.info(JSON.stringify(logObject));
        },
      },
    })
  ); 

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());


app.use('/images', express.static(imageDirectory));
app.use(cookieParser());

module.exports = app;