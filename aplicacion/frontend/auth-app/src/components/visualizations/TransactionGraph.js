import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import styled from 'styled-components';

const GraphContainer = styled.div`
  margin: 20px 0;
  padding: 20px;
  background-color: #f8fafb;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const GraphHeader = styled.h2`
  margin-bottom: 15px;
  color: #2e7d32;
`;

const GraphDescription = styled.p`
  margin-bottom: 20px;
  color: #555;
`;

const GraphDisplay = styled.div`
  height: 500px;
  width: 100%;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
  position: relative;
`;

const GraphControls = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 10px;
`;

const StyledButton = styled.button`
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: #45a049;
  }
`;

const Legend = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  font-size: 14px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const LegendColor = styled.div`
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const NodeTooltip = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  font-size: 12px;
  pointer-events: none;
  transform: translate(-50%, -100%);
  margin-top: -10px;
  z-index: 1000;
  display: ${props => props.visible ? 'block' : 'none'};
`;

const NoDataMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
  font-style: italic;
`;

const TransactionGraph = ({ transactions, users }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [tooltip, setTooltip] = useState({ visible: false, node: null, x: 0, y: 0 });
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const tooltipRef = useRef(null);

  // Handle window resize and initial dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({
          width: offsetWidth,
          height: Math.max(500, offsetHeight) // Ensure minimum height
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    // Run once to initialize
    setTimeout(updateDimensions, 100);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Transform transaction data into graph format
  useEffect(() => {
    if (!transactions || !users) return;

    // Transform the transactions data into a graph structure
    const nodes = [];
    const links = [];
    const nodeIds = new Set();

    // Create nodes for all users first (issuers and buyers)
    Object.entries(users).forEach(([id, userData]) => {
      const userId = parseInt(id);
      if (userId === 0) return; // Skip the placeholder "Available" user (buyer_id: 0)
      
      if (!nodeIds.has(`user-${userId}`)) {
        nodes.push({
          id: `user-${userId}`,
          name: userData.username || `User ${userId}`,
          type: userData.role?.toLowerCase() || 'unknown',
          color: userData.role?.toLowerCase() === 'issuer' ? '#4CAF50' : '#2196F3',
          size: 15,
          val: 20, // Influence node size in force-directed layout
        });
        nodeIds.add(`user-${userId}`);
      }
    });

    // Create nodes for bonds and establish links
    transactions.forEach(tx => {
      const bondNodeId = `bond-${tx.index}`;
      
      // Add bond node
      if (!nodeIds.has(bondNodeId)) {
        // Determine bond color based on status
        let bondColor = '#FFC107'; // Default yellow
        if (tx.compliance_status === 'compliant') {
          bondColor = '#4CAF50'; // Green
        } else if (tx.compliance_status === 'non_compliant') {
          bondColor = '#f44336'; // Red
        } else if (tx.compliance_status === 'under_review') {
          bondColor = '#FF9800'; // Orange
        }
        
        nodes.push({
          id: bondNodeId,
          name: `Bond #${tx.index}`,
          amount: tx.bond_amount,
          status: tx.compliance_status,
          maturity: tx.maturity_date,
          yield: tx.yield_rate,
          hash: tx.hash,
          type: 'bond',
          color: bondColor,
          size: 10,
          val: 15, // Influence node size in force-directed layout
        });
        nodeIds.add(bondNodeId);
      }

      // Link issuer to bond
      links.push({
        source: `user-${tx.issuer_id}`,
        target: bondNodeId,
        type: 'issues',
        color: '#4CAF50',
      });

      // Link buyer to bond (if the bond has been purchased)
      if (tx.buyer_id !== 0) {
        links.push({
          source: `user-${tx.buyer_id}`,
          target: bondNodeId,
          type: 'buys',
          color: '#2196F3',
        });
      }
    });

    setGraphData({ nodes, links });
  }, [transactions, users]);

  // Function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Graph control functions
  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  const handleCenterGraph = () => {
    if (graphRef.current) {
      graphRef.current.centerAt();
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 100);
      }, 300);
    }
  };

  // Handle node hover for tooltips
  const handleNodeHover = (node, prevNode) => {
    if (node) {
      setTooltip({
        visible: true,
        node,
        x: node.x,
        y: node.y
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  return (
    <GraphContainer>
      <GraphHeader>Transaction Relationship Graph</GraphHeader>
      <GraphDescription>
        Interactive visualization of the relationships between issuers, buyers, and bonds
      </GraphDescription>
      
      <Legend>
        <LegendItem>
          <LegendColor color="#4CAF50" />
          <span>Issuers</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#2196F3" />
          <span>Buyers</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#FFC107" />
          <span>Bonds (Pending)</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#4CAF50" />
          <span>Bonds (Compliant)</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#FF9800" />
          <span>Bonds (Under Review)</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#f44336" />
          <span>Bonds (Non-Compliant)</span>
        </LegendItem>
      </Legend>
      
      <GraphControls>
        <StyledButton onClick={handleZoomToFit}>Zoom to Fit</StyledButton>
        <StyledButton onClick={handleCenterGraph}>Center Graph</StyledButton>
      </GraphControls>
      
      <GraphDisplay ref={containerRef}>
        {graphData.nodes.length > 0 ? (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeLabel={node => ''}  // Using custom tooltip instead
              nodeColor={node => node.color}
              nodeRelSize={6}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={0.7}
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.01}
              linkColor={link => link.color}
              linkWidth={1.5}
              onNodeHover={handleNodeHover}
              cooldownTicks={100}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12/globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
                
                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size || 8, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color;
                ctx.fill();
                
                // Draw text background
                if (globalScale >= 0.6) {
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.fillRect(
                    node.x - bckgDimensions[0] / 2,
                    node.y + node.size + 2,
                    bckgDimensions[0],
                    bckgDimensions[1]
                  );
                  
                  // Draw text
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#333';
                  ctx.fillText(
                    label,
                    node.x,
                    node.y + node.size + 2 + fontSize / 2
                  );
                }
              }}
              onEngineStop={() => {
                // Auto-zoom to fit once the graph stabilizes
                if (graphRef.current) {
                  setTimeout(() => {
                    graphRef.current.zoomToFit(400, 100);
                  }, 500);
                }
              }}
            />
            
            {tooltip.visible && tooltip.node && (
              <NodeTooltip 
                ref={tooltipRef}
                visible={tooltip.visible}
                style={{
                  transform: `translate(${tooltip.x}px, ${tooltip.y - 10}px)`,
                  top: 0,
                  left: 0
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {tooltip.node.name}
                </div>
                
                {tooltip.node.type === 'bond' ? (
                  <>
                    <div>Amount: {formatCurrency(tooltip.node.amount)}</div>
                    <div>Status: {tooltip.node.status.replace('_', ' ')}</div>
                    {tooltip.node.maturity && (
                      <div>Maturity: {tooltip.node.maturity}</div>
                    )}
                    {tooltip.node.yield && (
                      <div>Yield Rate: {tooltip.node.yield}%</div>
                    )}
                  </>
                ) : (
                  <div>Role: {tooltip.node.type}</div>
                )}
              </NodeTooltip>
            )}
          </>
        ) : (
          <NoDataMessage>
            Loading graph data or no relationships to display...
          </NoDataMessage>
        )}
      </GraphDisplay>
    </GraphContainer>
  );
};

export default TransactionGraph;