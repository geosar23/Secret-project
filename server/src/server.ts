import { config } from "./config/env";
import app from "./app";
import { connectDB } from "./config/databases";

const PORT = config.PORT || 3000;

// Connect to database first, then start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 HRMS backend running on port ${PORT}`);
    });
});
