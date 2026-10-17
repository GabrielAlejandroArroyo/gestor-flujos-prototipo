import DesignerClient from "./DesignerClient";

type PageProps = { params: Promise<{ flowId: string }> };

export default async function DisenoFlowPage(props: PageProps): Promise<React.ReactElement> {
  const { flowId } = await props.params;
  return <DesignerClient flowId={flowId} />;
}
