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
import CircularProgress from "@mui/material/CircularProgress";
import { HexColorPicker } from "react-colorful";
import { Switch } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import styles from "../styles/Home.module.css";

const tabs = ["GPT", "GEMINI", "COMFY"];

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [promptValue, setPromptValue] = useState("");
  const [qrdata, setQrData] = useState(undefined);
  const [dataColor, setDataColor] = useState("#000000");
  const [logo, setLogo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelPick, setModelPick] = useState("GPT");

  const logoInputRef = useRef(null);
  const [error, setError] = useState({ url: "", logo: "" });

  // helper function to validate URL format
  const validateUrl = (url) => {
    // Checks for: Optional protocol + Domain name + Extension (like .com)
    const pattern = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,6}(\/.*)?$/i;
    return pattern.test(url);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/png", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError((prev) => ({
        ...prev,
        logo: "Only PNG and SVG files are allowed for logo.",
      }));
      e.target.value = "";
      return;
    }
    setError((prev) => ({ ...prev, logo: "" }));
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setQrData(null);
    setIsLoading(true);

    // Url validation
    if (!inputValue.trim()) {
      setError((prev) => ({ ...prev, url: "Please enter a valid URL." }));
      setIsLoading(false);
      return;
    }

    if (!validateUrl(inputValue)) {
      setError((prev) => ({
        ...prev,
        url: "Please enter a valid URL (e.g., https://example.com).",
      }));
      setIsLoading(false);
      return;
    }

    try {
      setError((prev) => ({ ...prev, url: "" }));

      // 1. If it starts with https:// (case insensitive), keep it.
      // 2. Otherwise, strip any http:// that might be there and add https://
      const normalizedUrl = /^https:\/\//i.test(inputValue)
        ? inputValue
        : `https://${inputValue.replace(/^http:\/\//i, "")}`;

      // Fetch the base QR code from our API
      const baseQR = await fetch("/api/base-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: normalizedUrl,
          dataColor: dataColor,
          logo: logo,
        }),
      });

      if (!baseQR.ok) {
        setError((prev) => ({
          ...prev,
          url: "Failed to generate QR code. Please try again.",
        }));
        setIsLoading(false);
        return;
      }

      const data = await baseQR.json();

      if (data.error) {
        setError((prev) => ({
          ...prev,
          url: "Failed to generate QR code. Please try again.",
        }));
        setIsLoading(false);
        return;
      }

      if (!promptValue.trim()) {
        setQrData(data.qrCode);
        setIsLoading(false);
        return;
      }

      // Send the base QR and prompt to the Artistic API
      const aiQR = await fetch("/api/artistic-ai-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseQrURL: data.qrCode,
          userPrompt: promptValue,
          originalUrl: normalizedUrl,
        }),
      });

      if (!aiQR.ok) {
        console.log("AI QR API error:", aiQR.statusText);
        setError((prev) => ({
          ...prev,
          url: "Failed to create AI QR code. Please try again.",
        }));
        setIsLoading(false);
        return;
      }

      const artisticData = await aiQR.json();
      if (artisticData.error) {
        setError((prev) => ({
          ...prev,
          url: "Failed to create AI QR code. Please try again.",
        }));
        setIsLoading(false);
      } else {
        setQrData(artisticData.b64);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error fetching QR code:", err);
      setError((prev) => ({
        ...prev,
        url: "Network error. Please check your connection and try again.",
      }));
      setIsLoading(false);
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
          bgcolor: "#ffff",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ mb: 3, fontWeight: "bold", color: "#fffff" }}
        >
          Artistic AI QR code Generator
        </Typography>

        <Box
          component="form"
          onSubmit={handleGenerate}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            fullWidth
            disabled={isLoading}
            placeholder="Enter URL"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError((prev) => ({ ...prev, url: "" }));
            }}
            sx={{
              bgcolor: "#E6E3EA",
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#555552", // normal
                },
                "&:hover fieldset": {
                  borderColor: "#704977", // hover color
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#704977", // focus color
                },
              },
            }}
            error={!!error.url}
            helperText={error.url ?? " "}
          />

          <Box className={styles.optionsContainer}>
            <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  mb: 1.5,
                  color: "#888",
                  fontWeight: 700,
                  display: "block",
                }}
              >
                Data Color
              </Typography>
              <Box
                sx={{
                  "& .react-colorful": {
                    width: "100%",
                    height: "160px",
                    borderRadius: "12px",
                  },
                }}
              >
                <HexColorPicker color={dataColor} onChange={setDataColor} />
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flex: 1,
                gap: 4,
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    mb: 1.5,
                    color: "#888",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  Branding
                </Typography>
                <input
                  disabled={isLoading}
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isLoading}
                    onClick={() => {
                      logoInputRef.current.click();
                      setError((prev) => ({ ...prev, logo: "" }));
                    }}
                    sx={{
                      textTransform: "none",
                      borderRadius: "8px",
                      bgcolor: "#704977",
                      boxShadow: "none",
                      py: 1,
                      "&:hover": {
                        bgcolor: "#5a3a60",
                        boxShadow: "0 2px 8px rgba(112, 73, 119, 0.2)",
                      },
                    }}
                  >
                    {logo ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {logo && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setLogo(null);
                        logoInputRef.current.value = "";
                      }}
                      sx={{
                        minWidth: "auto",
                        px: 2,
                        borderRadius: "8px",
                        borderColor: "#e0e0e0",
                        color: "#666",
                        "&:hover": {
                          borderColor: "#d32f2f",
                          color: "#d32f2f",
                          bgcolor: "transparent",
                        },
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
                {error.logo && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {error.logo}
                  </Typography>
                )}
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: "10px",
                  bgcolor: "#f9f9f9",
                  border: "1px solid #f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#333" }}
                  >
                    Enable Frame
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#888" }}>
                    Apply CTA border
                  </Typography>
                </Box>
                <Switch color="secondary" size="small" />
              </Box>
            </Box>
          </Box>

          <Box className={styles.optionsContainer}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  mb: 1.5,
                  color: "#888",
                  fontWeight: 700,
                  display: "block",
                }}
              >
                AI Model PICK
              </Typography>

              <Box
               className={styles.tabsContainer}
              >
                {tabs.map((tab) => (
                  <Box
                    key={tab}
                    onClick={() => setModelPick(tab)}
                    className={`${styles.tabs} ${modelPick === tab ? styles.activeTab : ""}`}
                  >
                    {tab}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <TextField
            disabled={isLoading}
            fullWidth
            placeholder="Enter Prompt"
            value={promptValue}
            onChange={(e) => {
              setPromptValue(e.target.value);
            }}
            sx={{
              bgcolor: "#E6E3EA",
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#555552", // normal
                },
                "&:hover fieldset": {
                  borderColor: "#704977", // hover color
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#704977", // focus color
                },
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            size="large"
            startIcon={<QrCodeIcon />}
            sx={{
              py: 1.5,
              textTransform: "none",
              fontSize: "1.1rem",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              bgcolor: "#704977",
            }}
          >
            {isLoading ? "Generating..." : "Generate"}
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
          bgcolor: "#ffffff",
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
            width: 400,
            height: 400,
            alignItems: "center",
            bgcolor: "#9c9a9a",
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CircularProgress size={28} />
              <Typography variant="caption" color="textSecondary">
                Generating...
              </Typography>
            </Box>
          ) : qrdata === null ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                color: "#999",
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Failed to generate QR code
              </Typography>
            </Box>
          ) : qrdata && qrdata.startsWith("data:image") ? (
            <Box
              sx={{
                position: "relative",
                width: 400,
                height: 400,
                bgcolor: "#9c9a9a",
                borderRadius: 2,
              }}
            >
              <Image
                src={qrdata}
                alt="Generated QR Code"
                width={400}
                height={400}
                unoptimized
              />
            </Box>
          ) : qrdata === undefined ? (
            <QRCodeSVG
              value="https://ilo.com.gr/"
              size={300}
              marginSize={3}
              level="H"
              fgColor={dataColor}
              imageSettings={{
                src: logo,
                height: 60,
                width: 80,
              }}
            />
          ) : (
            <QRCodeSVG
              value={qrdata}
              size={300}
              marginSize={3}
              level="H"
              fgColor={dataColor}
              imageSettings={{
                src: logo,
                height: 60,
                width: 80,
              }}
            />
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
              bgcolor: "#704977",
            }}
            disabled={!qrdata || !qrdata.startsWith("data:image") || isLoading}
          >
            Download QR Code
          </Button>
        </a>
      </Paper>
    </Container>
  );
}
