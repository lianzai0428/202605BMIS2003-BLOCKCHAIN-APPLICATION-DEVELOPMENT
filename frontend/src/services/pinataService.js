import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataGateway:
    import.meta.env.VITE_PINATA_GATEWAY ||
    "gateway.pinata.cloud",
});

export async function uploadProofToIPFS(file) {
  if (!file) {
    throw new Error("Please select a proof file.");
  }

  const signedUrlResponse = await fetch(
    "/api/pinata-url"
  );

  if (!signedUrlResponse.ok) {
    throw new Error(
      "Unable to obtain a secure Pinata upload URL."
    );
  }

  const { url } = await signedUrlResponse.json();

  const upload = await pinata.upload.public
    .file(file)
    .url(url);

  if (!upload?.cid) {
    throw new Error(
      "Upload completed but no IPFS CID was returned."
    );
  }

  return {
    cid: upload.cid,
    fileName: upload.name || file.name,
    size: upload.size || file.size,
    mimeType: upload.mime_type || file.type,
  };
}