import MaestrosClient from "./MaestrosClient";

export default function MaestrosPage(): React.ReactElement {
  return (
    <>
      <h1 className="page-title">Maestros y entidades</h1>
      <MaestrosClient />
    </>
  );
}
