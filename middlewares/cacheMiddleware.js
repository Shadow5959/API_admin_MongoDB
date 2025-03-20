const redisClient = require("../utils/redisClient");

const cacheMiddleware = async (req, res, next) => {
    try {
        if (!redisClient) {
            return next();
        }

        const cacheKey = req.originalUrl;

        // Check for cached response
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            req.user = req.user || { id: "cached-user" }; // Ensure req.user is retained
            return res.json(JSON.parse(cachedData));
        }

        // Store response in cache
        res.sendResponse = res.json;
        res.json = async (body) => {
            await redisClient.set(cacheKey, JSON.stringify(body), "EX", 36000);
            res.sendResponse(body);
        };

        next();
    } catch (error) {
        next();
    }
};

module.exports = cacheMiddleware;
