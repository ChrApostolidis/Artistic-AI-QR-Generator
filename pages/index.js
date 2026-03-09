"use client";
import Image from "next/image";
import { useState, useRef } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
} from "@mui/material";
import QrCodeIcon from "@mui/icons-material/QrCode";
import DownloadIcon from "@mui/icons-material/Download";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [qrdata, setQrData] = useState(null);
  const [color, setColor] = useState("#000000");
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState(null);
  const logoInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Only PNG and SVG files are allowed for logo.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    try {
      const response = await fetch(
        `/api/base-qr?url=${encodeURIComponent(inputValue)}&color=${encodeURIComponent(color)}`,
      );
      const data = await response.json();
      if (data.qrCode) {
        setQrData(data.qrCode);
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 8,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "flex-start",
        gap: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          flex: 1,
          borderRadius: 4,
          textAlign: "center",
          bgcolor: "#fdfdfd",
        }}
      >
        <Typography
          variant="h4"
          sx={{ mb: 3, fontWeight: "bold", color: "#1a202c" }}
        >
          QR Generator
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            fullWidth
            label="Enter URL"
            variant="outlined"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{ bgcolor: "white" }}
          />

          <TextField
            label="Foreground QR Color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            sx={{ width: 150 }}
          />

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/svg+xml"
            style={{ display: "none" }}
            onChange={handleLogoUpload}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                logoInputRef.current.click();
                setError(null);
              }}
              sx={{ textTransform: "none", borderRadius: "8px" }}
            >
              {logo ? "Change Logo" : "Upload Logo (optional)"}
            </Button>
            {logo && (
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={() => {
                  setLogo(null);
                  logoInputRef.current.value = "";
                  setError(null);
                }}
                sx={{ textTransform: "none" }}
              >
                Remove
              </Button>
            )}
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<QrCodeIcon />}
            onClick={handleGenerate}
            sx={{
              py: 1.5,
              textTransform: "none",
              fontSize: "1.1rem",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            Generate
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          p: { xs: 1, md: 4 },
          flex: 1,
          borderRadius: 4,
          textAlign: "center",
          bgcolor: "#fdfdfd",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "center",
            border: "1px dashed #ccc",
            borderRadius: 2,
            minHeight: "250px",
            width: "100%",
            alignItems: "center",
            bgcolor: "#fafafa",
          }}
        >
          {!qrdata ? (
            <Typography variant="body1" color="textSecondary">
              Enter a URL to generate QR code
            </Typography>
          ) : (
            <Box sx={{ position: "relative", width: 250, height: 250 }}>
              <Image
                src={qrdata}
                alt="Generated QR Code"
                width={250}
                height={250}
                unoptimized
              />
              {logo && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    bgcolor: "white",
                    borderRadius: 1.5,
                    p: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    src={logo}
                    alt="Logo"
                    width={50}
                    height={50}
                    style={{ objectFit: "contain", display: "block" }}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
        <a
          href={qrdata}
          download={"qrCode.png"}
          style={{ textDecoration: "none" }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<DownloadIcon />}
            sx={{
              py: 1.5,
              textTransform: "none",
              fontSize: "1.1rem",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            disabled={!qrdata}
          >
            Download QR Code
          </Button>
        </a>
      </Paper>
    </Container>
  );
}
