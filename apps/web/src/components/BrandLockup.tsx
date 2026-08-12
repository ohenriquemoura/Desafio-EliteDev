import Link from "next/link";
import styles from "./BrandLockup.module.css";

type Props = {
  href?: string;
  compact?: boolean;
};

export function BrandLockup({ href = "/", compact = false }: Props) {
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ""}`}>
      <Link href={href} className={styles.brand}>
        Elite Dev
      </Link>
      <a
        className={styles.powered}
        href="https://www.verzel.com.br/pt/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by Verzel"
      >
        <span>powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/verzel-logo.svg"
          alt="Verzel"
          className={styles.logo}
        />
      </a>
    </div>
  );
}
