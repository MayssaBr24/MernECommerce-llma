var express = require('express');
var router = express.Router();

const Categorie = require('../models/categories');

// afficher la liste des categories
router.get('/', async (req, res) => {
    try {
        const categories = await Categorie.find();
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// créer une nouvelle catégorie
router.post('/', async (req, res) => {
    const { nomcategorie, imagecategorie } = req.body;

    try {
        const newCategorie = new Categorie({
            nomcategorie,
            imagecategorie
        });

        await newCategorie.save();
        res.status(201).json(newCategorie);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// chercher une catégorie par ID
router.get('/:categorieId', async (req, res) => {
    try {
        const categorie = await Categorie.findById(req.params.categorieId);

        if (!categorie) {
            return res.status(404).json({ message: 'Categorie non trouvée' });
        }

        res.status(200).json(categorie);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// modifier une catégorie
router.put('/:categorieId', async (req, res) => {
    try {
        const updatedCategorie = await Categorie.findByIdAndUpdate(
            req.params.categorieId,
            req.body,
            { new: true }
        );

        if (!updatedCategorie) {
            return res.status(404).json({ message: 'Categorie non trouvée' });
        }

        res.status(200).json(updatedCategorie);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// supprimer une catégorie
router.delete('/:categorieId', async (req, res) => {
    try {
        const deletedCategorie = await Categorie.findByIdAndDelete(req.params.categorieId);

        if (!deletedCategorie) {
            return res.status(404).json({ message: 'Categorie non trouvée' });
        }

        res.status(200).json({ message: 'Categorie supprimée' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Chercher une catégorie par son nom
router.get('/search/:name', async (req, res) => {
    try {
        const cat = await Categorie.findOne({
            nomcategorie: { $regex: new RegExp(req.params.name, "i") }
        });
        res.status(200).json(cat);
    } catch (error) {
        res.status(404).json({ message: "Catégorie non trouvée" });
    }
});

module.exports = router;
