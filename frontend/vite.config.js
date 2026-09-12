import react from "@vitejs/plugin-react";
import {
  defineConfig,
  loadEnv,
} from "vite";

import {
  PinataSDK,
} from "pinata";


export default defineConfig(
  ({ mode }) => {
    const env = loadEnv(
      mode,
      process.cwd(),
      ""
    );

    const pinata =
      new PinataSDK({
        pinataJwt:
          env.PINATA_JWT,

        pinataGateway:
          env.PINATA_GATEWAY ||
          "gateway.pinata.cloud",
      });


    return {
      plugins: [
        react(),

        {
          name:
            "local-pinata-api",

          configureServer(server) {
            server.middlewares.use(
              "/api/pinata-url",

              async (
                req,
                res
              ) => {
                res.setHeader(
                  "Content-Type",
                  "application/json"
                );


                if (
                  req.method !==
                  "GET"
                ) {
                  res.statusCode =
                    405;

                  res.end(
                    JSON.stringify({
                      error:
                        "Method not allowed",
                    })
                  );

                  return;
                }


                if (
                  !env.PINATA_JWT
                ) {
                  res.statusCode =
                    500;

                  res.end(
                    JSON.stringify({
                      error:
                        "PINATA_JWT is missing from .env.local",
                    })
                  );

                  return;
                }


                try {
                  const url =
                    await pinata.upload.public.createSignedURL(
                      {
                        expires: 60,

                        maxFileSize:
                          10 *
                          1024 *
                          1024,

                        mimeTypes: [
                          "application/pdf",
                          "image/jpeg",
                          "image/png",
                        ],
                      }
                    );


                  res.statusCode =
                    200;

                  res.end(
                    JSON.stringify({
                      url,
                    })
                  );

                } catch (
                  error
                ) {
                  console.error(
                    "PINATA SIGNED URL ERROR:",
                    error
                  );


                  res.statusCode =
                    500;

                  res.end(
                    JSON.stringify({
                      error:
                        "Failed to create secure Pinata upload URL.",

                      details:
                        error?.message ||
                        String(
                          error
                        ),
                    })
                  );
                }
              }
            );
          },
        },
      ],
    };
  }
);