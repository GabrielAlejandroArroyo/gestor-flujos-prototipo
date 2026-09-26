import GestionClient from "./GestionClient";

export default function GestionPage(): React.ReactElement {
  return (
    <>
      <div className="kpi-row" style={{ marginBottom: "1rem" }}>
        <span className="stat-chip">
          Motor <strong>servidor</strong>
        </span>
        <span className="stat-chip">
          End Event <strong>al final</strong>
        </span>
      </div>
      <GestionClient />
    </>
  );
}
