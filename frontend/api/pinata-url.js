import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway:
    process.env.PINATA_GATEWAY ||
    "gateway.pinata.cloud",
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const url =
      await pinata.upload.public.createSignedURL({
        expires: 60,

        maxFileSize: 10 * 1024 * 1024,

        mimeTypes: [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ],
      });

    return res.status(200).json({ url });
  } catch (error) {
      console.error("PINATA SIGNED URL ERROR:");
      console.error(error);
    return res.status(500).json({
      error: "Failed to create secure upload URL.",
      details: error?.message || String(error),
    });
  }
}