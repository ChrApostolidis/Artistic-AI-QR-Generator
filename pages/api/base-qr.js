import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { decodeQrFromPng } from "../art-qr/route";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const dataColor = searchParams.get("dataColor") || "#000000";
  const logo = searchParams.get("logo") || "";

  if (!url) {
    return NextResponse.json(
      { error: "Missing URL parameter" },
      { status: 400 },
    );
  }

  try {
    const base64String = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      width: 1024,
      margin: 4,
      color: {
        dark: dataColor,
        light: "#ffffff",
      },
    });

   const result = decodeQrFromPng(base64String.replace(/^data:image\/\w+;base64,/, ""));
   console.log("Decoded QR from generated PNG:", result);

    return NextResponse.json({ qrCode: base64String });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate QR" },
      { status: 500 },
    );
  }
}
