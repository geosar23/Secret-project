import { config, validateEnv } from "./config/env";
import app from "./app";
import { connectDB } from "./config/databases";

validateEnv();

const PORT = config.PORT;

// Connect to database first, then start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 HRMS backend running on port ${PORT}`);
    });
});
