import express from "express";
import cors from "cors";
import apiRouter from "./api/routes";
import errorMiddleware from "./middleware/error.middleware";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { seedPermissions } from "./utils/permissions.utils";

// import swaggerUi from "swagger-ui-express"; //check later
// import swaggerDocument from "./swagger.json";

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per 15 minutes
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); // Enable CORS
app.use(express.json()); // parses incoming JSON requests
app.use(morgan("dev")); // HTTP request logger
app.use(helmet()); // sets secure HTTP headers
app.use(limiter);
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Swagger API docs

// Global API routes (composed)
app.use("/api", apiRouter);

// Global error handler
app.use(errorMiddleware);

seedPermissions().catch(err => console.error("Error seeding permissions on app start:", err));

export default app;
