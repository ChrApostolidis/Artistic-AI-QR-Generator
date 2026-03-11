import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import { decodeQrFromPng } from "./artistic-ai-qr";

export default async function baseQRGenerator(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, dataColor = "#000000", logo } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const canvasSize = 1380;
    const qrSize = 1024;
    const mainCanvas = createCanvas(canvasSize, canvasSize);
    const ctx = mainCanvas.getContext("2d");

    const qrCanvas = createCanvas(qrSize, qrSize);

    await QRCode.toCanvas(qrCanvas, url, {
      errorCorrectionLevel: "H",
      width: qrSize,
      margin: 4,
      color: {
        dark: dataColor,
        light: "#ffffff",
      },
    });

    // Centers the QR Code on the main canvas
    const qrOffset = (canvasSize - qrSize) / 2;
    ctx.drawImage(qrCanvas, qrOffset, qrOffset);

    // Draws Logo in the dead center
    if (logo && logo !== "undefined" && logo !== "null") {
      try {
        const logoImg = await loadImage(logo);
        const logoSize = qrSize * 0.24; // 24% of the QR code area
        const x = (canvasSize - logoSize) / 2;
        const y = (canvasSize - logoSize) / 2;

        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      } catch (logoErr) {
        console.error("Error loading logo:", logoErr);
        // Continue without logo if it fails to load
      }
    }

    const base64String = mainCanvas.toDataURL("image/png");

    const result = decodeQrFromPng(
      base64String.replace(/^data:image\/\w+;base64,/, ""),
    );
    console.log("Decoded QR from generated PNG:", result);

    return res.status(200).json({ qrCode: base64String });
  } catch (err) {
    console.error("Error generating QR code:", err);
    return res.status(500).json({ 
      error: "Failed to generate QR", 
      details: err.message 
    });
  }
}
