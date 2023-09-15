const Book = require("../models/books");
const fs = require("fs");

// POST : Création d'un livre
exports.createBook = (req, res, next) => {
      const bookStringified = req.body.book; // book renvoyé par multer en form-data
      const bookObject = JSON.parse(bookStringified);

      delete bookObject._id;
      delete bookObject._userId;


      const book = new Book({
            ...bookObject,
            userId: req.auth.userId,
            imageUrl: `${req.protocol}://${req.get("host")}/images/resized_${req.file.filename}`,
      });

      book.save()
            .then(() => {
                  res.status(201).json({ message: "Livre enregistré !" });
            })
            .catch((error) => {
                  res.status(400).json({ error });
            });
};

// GET : Récupération d'un livre
exports.getOneBook = (req, res, next) => {
      Book.findOne({ _id: req.params.id }) 
            .then((book) => {
                  res.status(200).json(book);
            })
            .catch((error) => {
                  res.status(404).json({ error: error });
            }); 
};

// GET : Récuperation de tous les livres
exports.getAllBooks = (req, res, next) => {
      Book.find() 
            .then((books) => {
                  res.status(200).json(books);
            })
            .catch((error) => {
                  res.status(400).json({ error: error });
            }); 
};

// GET : Récupération des 3 livres les mieux notés
exports.getBestRatingBooks = (req, res, next) => {
      // Tri des notes moyennes dans l'ordre décroissant, limitation du tableau aux 3 premiers éléments
      Book.find({})
            .sort({ averageRating: -1 }) 
            .limit(3)
            .exec()
            .then((bestRatingBooks) => {
                  res.status(200).json(bestRatingBooks);
            })
            .catch((error) => {
                  res.status(400).json({ error: error });
            });
};


// PUT : Mise à jour d'un livre
exports.modifyBook = (req, res, next) => {
      const bookStringified = req.body.book;
      // Soit un élément form-data, soit des données JSON, selon si le fichier image a été modifié ou non
      const bookObject = req.file
            ? {
                    ...JSON.parse(bookStringified),
                    imageUrl: `${req.protocol}://${req.get("host")}/images/resized_${req.file.filename}`,
              }
            : { ...req.body };

      delete bookObject.userId;

      Book.findOne({ _id: req.params.id })
            .then((book) => {
                  if (book.userId != req.auth.userId) {
                        res.status(401).json({ message: "Non autorisé !" });
                  } else {
                        // Séparation du nom du fichier image existant
                        const filename = book.imageUrl.split("/images/")[1];
                        // Suppression de l'ancienne image
                        if (req.file) {
                              fs.unlink(`images/${filename}`, (err) => {
                                    if (err) res.status(400).json({ err });
                              });
                        }
                        Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                              .then(() => res.status(200).json({ message: "Livre modifié!" }))
                              .catch((error) => res.status(401).json({ error }));
                  }
            })
            .catch((error) => {
                  res.status(400).json({ error });
            });
};

// DELETE : Suppression d'un livre
exports.deleteBook = (req, res, next) => {
      Book.findOne({ _id: req.params.id })
            .then((book) => {
                  if (book.userId != req.auth.userId) {
                        res.status(403).json({ message: "Not authorized" });
                  } else {
                        const filename = book.imageUrl.split("/images/")[1];
                        // Suppression du fichier image & du livre dans la db
                        fs.unlink(`images/${filename}`, () => {
                              Book.deleteOne({ _id: req.params.id })
                                    .then(() => {
                                          res.status(200).json({ message: "Livre supprimé !" });
                                    })
                                    .catch((error) => res.status(401).json({ error }));
                        });
                  }
            })
            .catch((error) => {
                  res.status(500).json({ error });
            });
};

// GET : Création d'une note
exports.createRating = (req, res, next) => {
      const ratingObject = req.body;
      delete ratingObject._id;

      if (ratingObject.rating < 0 || ratingObject.rating > 5) {
            return res.status(400).json({ message: "La note doit être comprise entre 0 et 5." });
      }

      Book.findOne({ _id: req.params.id })
            .then((book) => {
                  // Vérification que l'utilisateur authentifié n'a jamais donné de note au livre 
                  const hasRated = book.ratings.some((rating) => {
                        rating.userId === req.auth.userId;
                  });

                  if (hasRated) {
                        return res.status(401).json({ message: "Vous avez déjà noté le livre !" });
                  } else {
                        // Ajout de la note
                        book.ratings.push({ userId: req.auth.userId, grade: ratingObject.rating });

                        // Calcul de la nouvelle note moyenne
                        const totalRatings = book.ratings.length;
                        const sumRatings = book.ratings.reduce((total, rating) => total + rating.grade, 0);
                        const newAverageRating = sumRatings / totalRatings;

                        book.averageRating = newAverageRating;

                        book.save()
                              .then(() => {
                                    res.status(201).json(book);
                              })
                              .catch((error) => {
                                    res.status(400).json({ error });
                              });
                  }
            })
            .catch((error) => {
                  res.status(400).json({ error });
            });
};
