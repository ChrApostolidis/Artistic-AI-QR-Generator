import jsQR from "jsqr";
import { GoogleGenAI } from "@google/genai";
import { PNG } from "pngjs";
import { saveDebugQRCode } from "../../utils/helper";

export const runtime = "nodejs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const strictnessLevels = [
  "You MUST keep this QR code scannable. Apply artistic style BUT preserve the exact grid pattern, all three corner squares, and maintain perfect contrast. Change only colors, not shapes. Keep edges sharp and modules square. The QR code must remain fully functional and easily scannable by any standard QR reader. Do not add any blur, distortion, or textures that could interfere with readability. Apply Art inside the qr code not around keep the quite zone.",
  "You MUST keep this QR code scannable. Apply artistic style BUT preserve the exact grid pattern, all three corner squares, and maintain perfect contrast. Change only colors, not shapes. Keep edges sharp and modules square. The QR code must remain fully functional and easily scannable by any standard QR reader. Do not add any blur, distortion, or textures that could interfere with readability. Apply Art inside the qr code not around keep the quite zone. IMPORTANT: Less stylization. High contrast required. Keep all squares intact and edges crisp.",
  "You MUST keep this QR code scannable. Apply artistic style BUT preserve the exact grid pattern, all three corner squares, and maintain perfect contrast. Change only colors, not shapes. Keep edges sharp and modules square. The QR code must remain fully functional and easily scannable by any standard QR reader. Do not add any blur, distortion, or textures that could interfere with readability. Apply Art inside the qr code not around keep the quite zone. CRITICAL: Minimal changes only. Preserve exact QR structure. No textures or blur allowed.",
];

async function generateArtQr(prompt, base64Image) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      { text: prompt },
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/png",
        },
      },
    ],
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  return null;
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

    // Initialize variables that will be returned in the api response
    let lastB64 = null;
    let decodedText = null;
    let matched = false;

    // Create a unique session ID for grouping all 3 attempts
    const sessionId = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    for (let attempt = 0; attempt < strictnessLevels.length; attempt += 1) {
      const base64Image = baseQrURL.replace(/^data:image\/\w+;base64,/, "");

      const result = await generateArtQr(
        `${strictnessLevels[attempt]} Make a theme: ${userPrompt}`,
        base64Image,
      );

      // If we fail to get a valid base64 string, skip decoding and just try the next prompt
      if (!result) {
        continue;
      }

      lastB64 = result;
      decodedText = decodeQrFromPng(result);
      matched = decodedText === originalUrl;

      // Save the generated QR code for debugging
      saveDebugQRCode(
        result,
        {
          attempt: attempt + 1,
          prompt: strictnessLevels[attempt],
          userPrompt,
          decodedText,
          expectedUrl: originalUrl,
          matched,
          timestamp: new Date().toISOString(),
        },
        sessionId,
        "gemini-outputs",
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
        `QR validation failed after ${strictnessLevels.length} attempts. Decoded: ${decodedText}, Expected: ${originalUrl}`,
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
