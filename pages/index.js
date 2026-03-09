import Image from "next/image";
import { useState } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
} from "@mui/material";
import QrCodeIcon from "@mui/icons-material/QrCode";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [qrdata, setQrData] = useState(null);

  

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 8,
        display: "flex",
        flexDirection: {xs: "column", md:"row"},
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

          <Button
            variant="contained"
            size="large"
            startIcon={<QrCodeIcon />}
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
          p: {xs: 1, md: 4},
          flex: 1,
          borderRadius: 4,
          textAlign: "center",
          bgcolor: "#fdfdfd",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
            <Image
              src={qrdata}
              alt="Generated QR Code"
              width={250}
              height={250}
              unoptimized
            />
          )}
        </Box>

      </Paper>
    </Container>
  );
}
