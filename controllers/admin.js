const mongoose = require("mongoose");
const Product = require("../models/product");
const { validationResult } = require("express-validator");
exports.getAddProduct = (req, res, next) => {
    res.render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editing: false,
        hasErrorFields: false,
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render("admin/edit-product", {
            pageTitle: "Add Product",
            path: "/admin/add-product",
            editing: false,
            hasErrorFields: true,
            product: { title, imageUrl, price, description },
            errorMessage:
                errors.array().reduce((acc, e) => {
                    return acc + e.param + ", ";
                }, "") + " are invalid",
        });
    }
    const product = new Product({
        // _id: new mongoose.Types.ObjectId("5f1be149c160892e58b42e06"),
        title,
        price,
        description,
        imageUrl,
        userId: req.user,
    });

    product
        .save()
        .then((result) => {
            // console.log(result);
            res.redirect("/admin/products");
        })
        .catch((err) => {
            // console.log(err.message);
            // status code 500 for server side error
            /*
            return res.status(500).render("admin/edit-product", {
                pageTitle: "Add Product",
                path: "/admin/add-product",
                editing: false,
                hasErrorFields: true,
                product: { title, imageUrl, price, description },
                errorMessage: 'Database operation failed, please try again.'
            });
            */
            err.httpStatusCode = 500;
            return next(err);
            // this will pass all the routes until it finds error handling middleware
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit === "true"; // "true"
    if (!editMode) return res.redirect("/"); // we reached edit with setting edit query param
    const prodId = req.params.productId;

    Product.findOne({ _id: prodId, userId: req.user._id })
        .then((product) => {
            // throw new Error("Something wrong with editing");
            if (!product) {
                // we don't take user to edit page
                req.flash(
                    "error",
                    "You are not authorised to edit that product."
                );
                return res.redirect("/");
            }
            res.render("admin/edit-product", {
                pageTitle: "Edit Product",
                path: "/admin/edit-product",
                editing: editMode,
                hasErrorFields: false,
                product: product,
            });
        })
        .catch((err) => {
            err.httpStatusCode = 500;
            return next(err);
        });
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedImageUrl = req.body.imageUrl;
    const updatedDescription = req.body.description;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render("admin/edit-product", {
            pageTitle: "Add Product",
            path: "/admin/add-product",
            editing: true,
            hasErrorFields: true,
            product: {
                title: updatedTitle,
                imageUrl: updatedImageUrl,
                price: updatedPrice,
                description: updatedDescription,
                _id: prodId,
            },
            errorMessage:
                errors.array().reduce((acc, e) => {
                    return acc + e.param + ", ";
                }, "") + " are invalid",
        });
    }
    Product.findById(prodId)
        .then((product) => {
            if (product.userId.toString() !== req.user._id.toString()) {
                // we don't move forward with post edit request too
                req.flash(
                    "error",
                    "You are not authorised to edit that product."
                );
                return res.redirect("/");
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.imageUrl = updatedImageUrl;
            product.description = updatedDescription;
            return product.save().then((result) => {
                // console.log(result); // saved product
                res.redirect("/admin/products");
                /* 
                Here also we want to have status code 201 for successfully creating resource
                like res.status(201); res.redirect("/admin/products");
                but redirecting automatically sets status 300 
                we will see how to deal with this in rest api
                */
            });
        })

        .catch((err) => {
            err.httpStatusCode = 500;
            return next(err);
        });
};

exports.getProducts = (req, res, next) => {
    const successMessage = req.flash("success").pop();
    // we only show the products which user has added and thereby authorised to
    // edit and delete
    Product.find({ userId: req.user._id })
        // .select('title price -_id') // selecting particular fields that we want
        // .populate('userId', 'name') // populted userId with user information
        .then((products) => {
            res.render("admin/products", {
                prods: products,
                pageTitle: "Admin Products",
                path: "/admin/products",
                successMessage,
            });
        })
        .catch((err) => {
            err.httpStatusCode = 500;
            return next(err);
        });
};
exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    // giving condition userId: req.user._id ensures that
    // product is deleted only if created by logged in user.
    Product.deleteOne({ _id: prodId, userId: req.user._id }, (err) => {
        if (err) console.log(err);
        req.flash("success", "Product deleted successfully");
        res.redirect("/admin/products");
    });
};
exports.getProfile = (req, res, next) => {
    res.render("admin/profile", {
        path: "/admin/profile",
        pageTitle: req.user.name,
        name: req.user.name,
        email: req.user.email,
    });
};
