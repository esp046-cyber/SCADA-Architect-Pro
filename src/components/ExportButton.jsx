import { useReactFlow } from 'reactflow';
import { toPng } from 'html-to-image';

export function ExportButton() {
  const { getNodes } = useReactFlow();

  const handleExport = () => {
    const flowElement = document.querySelector('.react-flow__viewport');
    if (!flowElement) return;

    toPng(flowElement, {
      backgroundColor: '#0b1220', // Matches scada.bg
      quality: 0.95,
    }).then((dataUrl) => {
      const a = document.createElement('a');
      a.download = 'SCADA-Topology-Architecture.png';
      a.href = dataUrl;
      a.click();
    });
  };

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 bg-scada-accent/20 hover:bg-scada-accent/30 text-scada-accent border border-scada-accent/40 rounded text-xs font-semibold backdrop-blur transition-all"
    >
      📷 Export PNG Diagram
    </button>
  );
}
