"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./TicketQr.module.css";

type Props = {
  value: string;
  size?: number;
};

export function TicketQr({ value, size = 220 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark: "#12100d", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div className={styles.placeholder} style={{ width: size, height: size }} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="QR do ingresso"
      width={size}
      height={size}
      className={styles.qr}
    />
  );
}
