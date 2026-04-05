import express, { type Request, type Response } from "express";

const app = express();
const router = express.Router();

router.get("/booking", (_: Request, res: Response) => {
    console.log("Booking request received");
    res.status(200).send("Hello VIP Workflow!");
});

app.use("/api", router);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});