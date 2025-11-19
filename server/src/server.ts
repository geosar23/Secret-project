import { config } from "./config/env";
import app from "./app";

const PORT = config.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 HRMS backend running on port ${PORT}`);
});
