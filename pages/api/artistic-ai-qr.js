import OpenAI from "openai";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { convertBaseUrlToFile, saveDebugQRCode } from "../../utils/helper";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const basePrompt =
  "You MUST keep this QR code scannable. Apply artistic style BUT preserve the exact grid pattern, all three corner squares, and maintain perfect contrast. Change only colors, not shapes. Keep edges sharp and modules square. The QR code must remain fully functional and easily scannable by any standard QR reader. Do not add any blur, distortion, or textures that could interfere with readability. Apply Art inside the qr code not around keep the quite zone.";
const retryPrompt2 =
  "IMPORTANT: Less stylization. The QR code pattern must be clearly visible with very high contrast. Keep all squares intact and edges crisp. Only apply color changes.";
const retryPrompt3 =
  "CRITICAL: Minimal changes only. Preserve the exact QR structure. High contrast. No blur, no distortion, no textures.";

export function decodeQrFromPng(base64Png) {
  try {
    const buffer = Buffer.from(base64Png, "base64");
    const png = PNG.sync.read(buffer);
    const pixels = new Uint8ClampedArray(png.data);

    const result = jsQR(pixels, png.width, png.height);
    return result?.data || null;
  } catch (err) {
    console.error("Failed to decode QR code from PNG", err);
    return null;
  }
}

async function generateArtQr(qrFile, prompt) {
  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: qrFile,
    prompt,
  });

  return response?.data?.[0]?.b64_json || null;
}

export default async function artisticAIQRGenerator(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userPrompt, baseQrURL, originalUrl } = req.body;

    // Basic validation
    if (!userPrompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    if (!baseQrURL || typeof baseQrURL !== "string") {
      return res.status(400).json({ error: "Missing baseQRURL" });
    }
    if (!originalUrl || typeof originalUrl !== "string") {
      return res.status(400).json({ error: "Missing originalUrl" });
    }

    const prompts = [
      `${basePrompt} ${userPrompt}`,
      `${basePrompt} ${retryPrompt2} ${userPrompt}`,
      `${basePrompt} ${retryPrompt3} ${userPrompt}`,
    ];

    // Initialize variables that will be returned in the api response
    let lastB64 = null;
    let decodedText = null;
    let matched = false;

    // Create a unique session ID for grouping all 3 attempts
    const sessionId = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    for (let attempt = 0; attempt < prompts.length; attempt += 1) {
      // recreate file each attempt to avoid multipart/file reuse issues
      const qrFile = await convertBaseUrlToFile(baseQrURL);

      const b64 = await generateArtQr(qrFile, prompts[attempt]);
      // If we fail to get a valid base64 string, skip decoding and just try the next prompt
      if (!b64) {
        continue;
      }

      lastB64 = b64;
      decodedText = decodeQrFromPng(b64);
      matched = decodedText === originalUrl;

      // Save the generated QR code for debugging
      saveDebugQRCode(
        b64,
        {
          attempt: attempt + 1,
          prompt: prompts[attempt],
          userPrompt,
          decodedText,
          expectedUrl: originalUrl,
          matched,
          timestamp: new Date().toISOString(),
        },
        sessionId,
      );

      if (matched) {
        break;
      } else if (decodedText) {
        console.warn(
          `Attempt ${attempt + 1}: Decoded text does not match original URL. Decoded: ${decodedText}`,
        );
      } else {
        console.warn(`Attempt ${attempt + 1}: Failed to decode QR code.`);
      }
    }

    if (!lastB64) {
      return res.status(500).json({ error: "Failed to generate image" });
    }

    // Only return success if the QR code is scannable and matches
    if (!matched) {
      console.error(
        `QR validation failed after ${prompts.length} attempts. Decoded: ${decodedText}, Expected: ${originalUrl}`,
      );
      return res.status(422).json({
        error:
          "Failed to generate a scannable QR code. The AI-generated image could not be validated. Try a simpler style prompt or use the basic QR code.",
        decodedText,
        matched: false,
      });
    }

    const finalOutput = `data:image/png;base64,${lastB64}`;
    console.log(
      `Success: QR validated after attempts. Decoded: ${decodedText}`,
    );

    return res.status(200).json({
      b64: finalOutput,
      decodedText,
      matched: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
