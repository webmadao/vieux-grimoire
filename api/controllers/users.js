const bcrypt = require("bcrypt");
const User = require("../models/users");
const jwt = require("jsonwebtoken");

// POST : inscription
exports.signup = (req, res, next) => {
      bcrypt.hash(req.body.password, 10)
            .then((hash) => {
                  const user = new User({
                        email: req.body.email,
                        password: hash,
                  });
                  user.save()
                        .then(() => res.status(201).json({ message: "Utilisateur créé !" }))
                        .catch((error) => res.status(400).json({ error }));
            })
            .catch((error) => res.status(500).json({ error }));
};

// POST : connexion
exports.login = (req, res, next) => {
      User.findOne({ email: req.body.email })
            .then((user) => {
                  if (!user) {
                        return res.status(401).json({ error: "Utilisateur non trouvé !" });
                  } else {
                        // Comparaison mdp avec le hash dans la db
                        bcrypt.compare(req.body.password, user.password)
                              .then((valid) => {
                                    if (!valid) {
                                          return res.status(401).json({ error: "Mot de passe incorrect !" });
                                    }
                                    res.status(200).json({
                                          userId: user._id,
                                          token: jwt.sign({ userId: user._id }, process.env.KEY_JWT , { expiresIn: "24h" }),
                                    });
                              })
                              .catch((error) => res.status(500).json({ error }));
                  }
            })
            .catch((error) => res.status(500).json({ error }));
};
