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
    path: "/bookings",
    route: require("./modules/Bookings/routes"),
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
    path: "/reviews",
    route: require("./modules/Reviews/routes"),
  },
  {
    path: "/notifications",
    route: require("./modules/Notifications/routes"),
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
