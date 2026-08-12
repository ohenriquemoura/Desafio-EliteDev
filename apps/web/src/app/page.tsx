import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <p className={styles.brand}>Elite Dev</p>
      <h1 className={styles.title}>Eventos e ingressos</h1>
      <p className={styles.lead}>
        Organize sessões a partir de filmes, reserve na pista e valide na
        entrada.
      </p>
      <Link className={styles.cta} href="/login">
        Entrar
      </Link>
    </main>
  );
}
