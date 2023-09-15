const jwt = require("jsonwebtoken");

// Extraction de l'userId du token
module.exports = (req, res, next) => {
      try {
            const token = req.headers.authorization.split(" ")[1];
            const decodedToken = jwt.verify(token, process.env.KEY_JWT);
            const userId = decodedToken.userId;
            req.auth = {
                  userId: userId,
            };
            next();
      } catch (error) {
            res.status(401).json({ error });

      }
};
