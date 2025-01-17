const Product = require("../../models/Product");
const Shop = require("../../models/Shop");
const authCheck = require("../../util/authCheck");

module.exports = {
  Query: {
    products: async () => {
      const products = await Product.find()
        .populate("shop")
        .sort({ createdAt: -1 });
      return products;
    },
    product: async (parent, args) => {
      const product = await Product.findById(args.productId).populate("shop");
      return product;
    },
  },
  Mutation: {
    createProduct: async (parent, args, context) => {
      const { userName } = authCheck(context);
      const {
        images,
        price,
        color,
        company,
        size,
        number,
        desc,
        title,
        shopId,
      } = args;

      const shop = await Shop.findById(shopId);
      const newProduct = new Product({
        title,
        userName,
        images,
        price,
        color,
        company,
        size,
        number,
        desc,
        shop: shopId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const res = await newProduct.save();
      context.pubsub.publish("NEW_PRODUCT", {
        product: res,
      });
      shop.products = [newProduct, ...shop.products];
      await shop.save();
      return true;
    },
    deleteProduct: async (parent, args, context) => {
      const user = authCheck(context);
      const product = await Product.findById(args.productId);
      if (product.userName === user.userName) {
        await product.delete();
        return true;
      }
    },
    updateProduct: async (parent, args) => {
      const {
        images,
        price,
        color,
        company,
        size,
        number,
        productId,
        desc,
        title,
      } = args;
      const product = await Product.findById(productId);
      product.images = images ? images : product.images;
      product.price = price ? price : product.price;
      product.color = color ? color : product.color;
      product.company = company ? company : product.company;
      product.size = size ? size : product.size;
      product.number = number ? number : product.number;
      product.desc = desc ? desc : product.desc;
      product.title = title ? title : product.title;
      await product.save();
      return true;
    },
    likeProduct: async (parent, args, context, info) => {
      try {
        const { productId } = args;
        const product = await Product.findById(productId);
        const user = authCheck(context);
        const like = {
          user: user.userName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const liked = product.likes.find((item) => item.user == user.userName);
        if (liked) {
          product.likes = product.likes.filter(
            (item) => item.user != user.userName
          );
        } else {
          product.likes = [like, ...product.likes];
        }
        await product.save();
        return true;
      } catch (error) {
        console.error(error);
      }
    },
    createComment: async (parent, args, context, info) => {
      const { productId, body } = args;
      try {
        const user = authCheck(context);
        const product = await Product.findById(productId);
        const comment = {
          user: user.userName,
          body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        product.comments = [comment, ...product.comments];
        await product.save();
        return true;
      } catch (error) {
        console.error(error);
      }
    },
    deleteComment: async (parent, args, context, info) => {
      try {
        const { productId, commentId } = args;
        const user = authCheck(context);
        const product = await Product.findById(productId);
        const comment = product.comments.find((it) => it.id === commentId);
        if (comment && comment.user === user.userName) {
          product.comments = product.comments.filter(
            (item) => item.id !== commentId
          );
          await product.save();
          return true;
        } else {
          throw new Error({ msg: "این نظر متعلق به فرد دیگری است" });
        }
      } catch (error) {
        console.error(error);
      }
    },
  },
  Subscription: {
    onProductCreate: {
      subscribe: (_, __, { pubsub }) => {
        return pubsub.asyncIterator("NEW_PRODUCT");
      },
    },
  },
};
