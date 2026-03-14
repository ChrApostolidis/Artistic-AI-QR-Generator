import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import path from "path";
import { decodeQrFromPng } from "./artistic-ai-qr";

export default async function baseQRGenerator(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, dataColor = "#000000", logo, frameEnabled } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const frameLayout = {
      canvasWidth: 1200,
      canvasHeight: 1400,
      frameRectX: 40,
      frameRectY: 40,
      frameRectSize: 1120,
      frameStroke: 24,
      qrInset: 20,
    };

    let frameImage = null;
    const canvasWidth = frameEnabled ? frameLayout.canvasWidth : 1380;
    const canvasHeight = frameEnabled ? frameLayout.canvasHeight : 1380;

    if (frameEnabled) {
      const framePath = path.join(process.cwd(), "public", "frame-scan-tight.svg");
      frameImage = await loadImage(framePath);
    }

    const mainCanvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = mainCanvas.getContext("2d");

    if (frameEnabled && frameImage) {
      ctx.drawImage(frameImage, 0, 0, canvasWidth, canvasHeight);
    }

    const qrSize = frameEnabled
      ? frameLayout.frameRectSize - frameLayout.frameStroke - frameLayout.qrInset * 2
      : 1024;
    const qrCanvas = createCanvas(qrSize, qrSize);

    await QRCode.toCanvas(qrCanvas, url, {
      errorCorrectionLevel: "H",
      width: qrSize,
      margin: frameEnabled ? 2 : 3,
      color: {
        dark: dataColor,
        light: "#ffffff",
      },
    });

    // Centers the QR Code on the main canvas
    const qrOffsetX = frameEnabled
      ? frameLayout.frameRectX + frameLayout.frameStroke / 2 + frameLayout.qrInset
      : (canvasWidth - qrSize) / 2;
    const qrOffsetY = frameEnabled
      ? frameLayout.frameRectY + frameLayout.frameStroke / 2 + frameLayout.qrInset
      : (canvasHeight - qrSize) / 2;
    ctx.drawImage(qrCanvas, qrOffsetX, qrOffsetY);

    // Draws Logo in the dead center
    if (logo && logo !== "undefined" && logo !== "null") {
      try {
        const logoImg = await loadImage(logo);
        const logoSize = qrSize * 0.24; // 24% of the QR code area
        const x = qrOffsetX + (qrSize - logoSize) / 2;
        const y = qrOffsetY + (qrSize - logoSize) / 2;

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
