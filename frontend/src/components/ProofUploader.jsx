import { useRef, useState } from "react";
import { uploadProofToIPFS } from "../services/pinataService";

export default function ProofUploader({
  agreementId,
  milestoneId,
  onUploaded,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] =
    useState(false);

  const [uploadResult, setUploadResult] =
    useState(null);

  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];

  const MAX_FILE_SIZE =
    10 * 1024 * 1024;

  function validateFile(selectedFile) {
    setError("");
    setUploadResult(null);

    if (!selectedFile) {
      return;
    }

    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      setError(
        "Only PDF, JPG, JPEG and PNG files are allowed."
      );

      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "The selected file exceeds the maximum size of 10 MB."
      );

      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0];

    validateFile(selectedFile);
  }

  function handleDrop(event) {
    event.preventDefault();

    const droppedFile =
      event.dataTransfer.files?.[0];

    validateFile(droppedFile);
  }

  async function handleUpload() {
    if (!file) {
      setError(
        "Please select a proof file first."
      );

      return;
    }

    try {
      setUploading(true);
      setError("");
      setUploadResult(null);

      const result =
        await uploadProofToIPFS(file);

      const finalResult = {
        agreementId,
        milestoneId,
        ...result,
      };

      setUploadResult(finalResult);

      if (onUploaded) {
        onUploaded(finalResult);
      }
    } catch (err) {
      console.error(
        "Proof upload failed:",
        err
      );

      setError(
        err?.message ||
          "Failed to upload proof to IPFS."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="proof-uploader">
      <div
        className={`proof-upload-zone ${
          file ? "has-file" : ""
        }`}
        onDragOver={(event) =>
          event.preventDefault()
        }
        onDrop={handleDrop}
      >
        <div className="proof-upload-left">
          <div className="upload-cloud-icon">
            ☁
          </div>

          <div>
            <strong>
              {file
                ? file.name
                : "Choose a file"}
            </strong>

            <p>
              {file
                ? `${(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)} MB`
                : "PDF, JPG, JPEG or PNG (max. 10 MB)"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          Choose File
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          hidden
        />
      </div>

      <p className="proof-file-help">
        Supported formats: PDF, JPG,
        JPEG and PNG. Maximum file
        size: 10 MB.
      </p>

      {error && (
        <div className="proof-error-box">
          {error}
        </div>
      )}

      <button
        type="button"
        className="primary-button"
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading
          ? "Uploading to IPFS..."
          : "Upload Proof to IPFS"}
      </button>

      {uploadResult && (
        <div className="proof-upload-success">
          <div className="success-icon">
            ✓
          </div>

          <div className="success-content">
            <strong>
              Proof uploaded successfully
            </strong>

            <div className="success-details">
              <div>
                <span>
                  File Name
                </span>

                <strong>
                  {
                    uploadResult.fileName
                  }
                </strong>
              </div>

              <div>
                <span>
                  IPFS CID
                </span>

                <code>
                  {uploadResult.cid}
                </code>
              </div>

              <div>
                <span>
                  Storage
                </span>

                <strong>
                  IPFS via Pinata
                </strong>
              </div>
            </div>

            <p className="success-note">
              The file has been uploaded
              to IPFS. The CID has not yet
              been submitted to the
              blockchain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}