import serverless from "serverless-http";
import createApp from "#core/create_app.js";
import routes from "../routes/routes.js";

const app = createApp("/tracks", routes);
export const handler = serverless(app);
