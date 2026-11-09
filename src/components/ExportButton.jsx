import { useState } from 'react';
import { useReactFlow, getRectOfNodes, getTransformForBounds } from 'reactflow';
import { toPng } from 'html-to-image';

export function ExportButton() {
  const { getNodes } = useReactFlow();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    const nodes = getNodes();
    
    // Prevent empty exports
    if (nodes.length === 0) {
      alert('The canvas is empty. Add equipment before exporting.');
      return;
    }

    const flowElement = document.querySelector('.react-flow__viewport');
    if (!flowElement) return;

    setIsExporting(true);

    // Calculate the total bounding box of all nodes to prevent cropping
    const nodesBounds = getRectOfNodes(nodes);
    const imageWidth = nodesBounds.width + 150; // 150px padding
    const imageHeight = nodesBounds.height + 150;
    
    // Generate the exact transform needed to fit all nodes in the image
    const transform = getTransformForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2);

    toPng(flowElement, {
      backgroundColor: '#0b1220', // Matches scada.bg
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
      quality: 1, // Max quality for professional diagrams
    })
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.download = 'SCADA-Topology-Architecture.png';
        a.href = dataUrl;
        a.click();
      })
      .catch((err) => {
        console.error('Failed to export diagram:', err);
        alert('An error occurred while generating the PNG. Check the console.');
      })
      .finally(() => {
        setIsExporting(false);
      });
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`px-3 py-1.5 border rounded text-xs font-semibold backdrop-blur transition-all ${
        isExporting
          ? 'bg-scada-accent/10 border-scada-accent/20 text-scada-accent/50 cursor-wait'
          : 'bg-scada-accent/20 hover:bg-scada-accent/30 text-scada-accent border-scada-accent/40'
      }`}
    >
      {isExporting ? '⏳ Generating PNG...' : '📷 Export PNG Diagram'}
    </button>
  );
}
