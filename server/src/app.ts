import express from "express";
import cors from "cors";
import "./services/approvals/register-request-types"; // request type behaviour must be registered before any request
import apiRouter from "./routes";
import errorMiddleware, { notFoundMiddleware } from "./middleware/error.middleware";
import { tooManyRequestsError } from "./utils/response.util";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";

// import swaggerUi from "swagger-ui-express"; //check later
// import swaggerDocument from "./swagger.json";

const app = express();

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per 1 minute
    handler: (_req, res) => tooManyRequestsError(res),
});

app.use(cors({ origin: config.CLIENT_URL, credentials: true })); // Enable CORS
app.use(express.json()); // parses incoming JSON requests
app.use(morgan("dev")); // HTTP request logger
app.use(helmet()); // sets secure HTTP headers
app.use(limiter);
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Swagger API docs

// Global API routes (composed)
app.use("/api", apiRouter);

// Unknown routes
app.use(notFoundMiddleware);

// Global error handler
app.use(errorMiddleware);

export default app;
