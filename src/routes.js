const express = require("express");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/auth",
    route: require("./modules/Auth/routes"),
  },
  {
    path: "/users",
    route: require("./modules/Users/routes"),
  },
  {
    path: "/listings",
    route: require("./modules/Listings/routes"),
  },
  {
    path: "/categories",
    route: require("./modules/Categories/routes"),
  },
  {
    path: "/ledger",
    route: require("./modules/Ledger/routes"),
  },
  {
    path: "/files",
    route: require("./modules/Files/routes"),
  },
  {
    path: "/chat",
    route: require("./modules/Chat/routes"),
  },
  {
    path: "/notifications",
    route: require("./modules/Notifications/routes"),
  },
  {
    path: "/payments",
    route: require("./modules/Payments/routes"),
  },
  {
    path: "/subscriptions",
    route: require("./modules/Subscriptions/routes"),
  },
  {
    path: "/banners",
    route: require("./modules/Banners/routes"),
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
