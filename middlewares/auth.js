const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

/***
 * @param { express.Request} req
 * @param { express.Response} res
 * @param { express.NextFunction} next
 */

function auth(req, res, next) {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(" ")[1];
  if (!token) {
    return res.status(400).json({ msg: "Token is required" });
  }
  const user = jwt.decode(token, process.env.JWT_SECRET);

  if (!user) {
    return res.status(401).json({ msg: "Incorrect Token" });
  }
  res.locals.user = user;
  next();
}

function isOwner(type) {
  return async (req, res, next) => {
    const { id } = req.params;
    const user = res.locals.user;

    try {
      if (type === "post") {
        const post = await prisma.post.findUnique({
          where: { id: Number(id) },
        });
        if (!post) {
          return res.status(404).json({ msg: "Post not found" });
        }
        if (post.userId === user.id) {
          return next();
        } else {
          return res.status(403).json({ msg: "Unauthorized to delete post" });
        }
      }

      if (type === "comment") {
        const comment = await prisma.comment.findUnique({
          where: { id: Number(id) },
          include: {
            post: true,
          },
        });

        if (!comment) {
          return res.status(404).json({ msg: "Comment not found" });
        }

        // Check if the user is either the owner of the post or the owner of the comment
        if (comment.post.userId === user.id || comment.userId === user.id) {
          return next();
        } else {
          return res
            .status(403)
            .json({ msg: "Unauthorized to delete comment" });
        }
      }

      // If no valid type is provided
      return res.status(400).json({ msg: "Invalid request type" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Server error" });
    }
  };
}

module.exports = { auth, isOwner };
