import { toFile } from "openai";
import fs from "fs";
import path from "path";

export const convertBaseUrlToFile = async (baseQrURL) => {
    // Convert "data:image/png;base64,AAAA" -> "AAAA"
    // 1) data url -> raw base64
    const base64 = baseQrURL.replace(/^data:image\/\w+;base64,/, "");

    // 2) base64 -> Buffer
    const buffer = Buffer.from(base64, "base64");

    // 3) Buffer -> File (multipart upload)
    const qrFile = await toFile(buffer, "qr.png", { type: "image/png" });

    return qrFile;
}

// Helper to save generated QR codes for debugging
export const saveDebugQRCode = async (b64Data, metadata, sessionId) => {
  try {
    const baseOutputDir = path.join(process.cwd(), "qr-outputs");
    const sessionDir = path.join(baseOutputDir, sessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const filename = `attempt_${metadata.attempt}.png`;
    const filepath = path.join(sessionDir, filename);

    // Save the image
    fs.writeFileSync(filepath, Buffer.from(b64Data, "base64"));

    // Save metadata
    const metadataFile = path.join(sessionDir, `attempt_${metadata.attempt}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

    console.log(`Saved debug QR: ${sessionId}/${filename}`);
  } catch (err) {
    console.error("Failed to save debug QR:", err.message);
  }
}
