import Link from "next/link";
import { BrandLockup } from "@/components/BrandLockup";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.hero}>
      <div className={styles.overlay} />
      <header className={styles.top}>
        <BrandLockup />
        <Link className={styles.topLink} href="/login">
          Entrar
        </Link>
      </header>

      <section className={styles.content}>
        <p className={styles.kicker}>Cinema · Shows · Ingressos</p>
        <h1 className={styles.title}>
          A sessão começa
          <span> no Elite Dev</span>
        </h1>
        <p className={styles.lead}>
          Monte eventos a partir do catálogo, reserve na pista e valide na
          portaria — do cartaz ao QR.
        </p>
        <div className={styles.actions}>
          <Link className={styles.cta} href="/events">
            Comprar ingresso
          </Link>
          <Link className={styles.secondary} href="/login">
            Área do organizador
          </Link>
        </div>
      </section>
    </main>
  );
}
