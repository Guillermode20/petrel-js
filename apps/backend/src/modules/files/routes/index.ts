import { Elysia } from "elysia";
import { downloadRoutes } from "./download.routes";
import { listRoutes } from "./list.routes";
import { mediaRoutes } from "./media.routes";
import { mutateRoutes } from "./mutate.routes";
import { uploadRoutes } from "./upload.routes";
import { zipRoutes } from "./zip.routes";

export const fileRoutes = new Elysia({ prefix: "" })
	.use(uploadRoutes)
	.use(listRoutes)
	.use(downloadRoutes)
	.use(mediaRoutes)
	.use(mutateRoutes)
	.use(zipRoutes);
