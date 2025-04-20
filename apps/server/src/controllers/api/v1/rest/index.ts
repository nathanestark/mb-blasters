import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  console.log("Process request");
  res.json({ message: "Hello world!" });
});

export default router;
