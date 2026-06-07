"use strict";

function productionMiddleware(app) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  app.set("trust proxy", 1);

  const canonicalHost = (process.env.CANONICAL_HOST || "www.diversewayclinic.com")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  app.use((req, res, next) => {
    const forwardedProto = req.get("x-forwarded-proto");
    const host = (req.get("x-forwarded-host") || req.get("host") || "")
      .split(":")[0]
      .toLowerCase();

    if (forwardedProto && forwardedProto !== "https") {
      const targetHost = host || canonicalHost;
      return res.redirect(301, `https://${targetHost}${req.originalUrl}`);
    }

    if (host && host !== canonicalHost && !host.endsWith(".onrender.com")) {
      return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
    }

    next();
  });
}

module.exports = { productionMiddleware };
