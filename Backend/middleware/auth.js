const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;
  let token = req.headers.authorization;

  if (!jwtSecret) {
    return res.status(500).json({ msg: "JWT secret is not configured" });
  }

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  // 🔥 handle Bearer format
  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};
