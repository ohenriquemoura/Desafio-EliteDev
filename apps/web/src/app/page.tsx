import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <p className={styles.brand}>Elite Dev</p>
      <h1 className={styles.title}>Eventos e ingressos</h1>
      <p className={styles.lead}>
        Setup do monorepo. O fluxo de reserva, pagamento e portaria entra nas
        próximas etapas.
      </p>
    </main>
  );
}
