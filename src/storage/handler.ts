import serverless from "serverless-http";
import createApp from "#core/create_app.js";
import router from "./routes.js";

const app = createApp("/storage", router);

export const handler = serverless(app);
